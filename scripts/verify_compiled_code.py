import sys
import os
import tempfile
import importlib.util

# 1. Sample generated codes to test
SAMPLES = {
    "CNN": """
import torch
import torch.nn as nn

class GeneratedModel(nn.Module):
    \"\"\"
    Generated automatically by ArchNet visual designer.
    \"\"\"
    def __init__(self):
        super(GeneratedModel, self).__init__()
        self.c1 = nn.Conv2d(in_channels=3, out_channels=32, kernel_size=3, padding=1)
        self.p1 = nn.MaxPool2d(kernel_size=2, stride=2)
        self.flat = nn.Flatten()
        self.fc = nn.Linear(in_features=112 * 112 * 32, out_features=10)

    def forward(self, x):
        x = self.c1(x)
        x = self.p1(x)
        x = self.flat(x)
        return self.fc(x)
""",
    "ResNetBlock": """
import torch
import torch.nn as nn

class GeneratedModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.c1 = nn.Conv2d(3, 64, 3, padding=1)
        self.c2 = nn.Conv2d(64, 64, 3, padding=1)

    def forward(self, x):
        h = self.c1(x)
        out = self.c2(h)
        return out + h # Residual Addition
""",
    "SequenceModel": """
import torch
import torch.nn as nn

class GeneratedModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.embed = nn.Embedding(num_embeddings=1000, embedding_dim=128)
        self.lstm = nn.LSTM(input_size=128, hidden_size=64, batch_first=True)

    def forward(self, x):
        # x is long tensor [Batch, SeqLen]
        emb = self.embed(x)
        out, _ = self.lstm(emb)
        return out[:, -1, :] # Return last step hidden state
"""
}

def verify_syntax(code_str: str) -> bool:
    try:
        compile(code_str, "<string>", "exec")
        return True
    except SyntaxError as e:
        print(f"Syntax validation failed: {e}")
        return False

def verify_runtime(code_str: str, sample_name: str) -> bool:
    # 1. Check if torch is installed
    try:
        import torch
    except ImportError:
        print("PyTorch is not installed. Skipping runtime forward pass verification.")
        return True

    # 2. Write to a temporary file
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = os.path.join(tmpdir, f"model_{sample_name}.py")
        with open(filepath, "w") as f:
            f.write(code_str)

        # 3. Dynamic import
        spec = importlib.util.spec_from_file_location(f"model_{sample_name}", filepath)
        module = importlib.util.module_from_spec(spec)
        sys.modules[f"model_{sample_name}"] = module
        try:
            spec.loader.exec_module(module)
        except Exception as e:
            print(f"Failed to load compiled module: {e}")
            return False

        # 4. Instantiate and verify forward pass
        try:
            model = module.GeneratedModel()
            
            if sample_name == "SequenceModel":
                dummy_input = torch.randint(0, 1000, (2, 50)) # Batch 2, SeqLen 50
                output = model(dummy_input)
                expected_shape = (2, 64)
            elif sample_name == "CNN":
                dummy_input = torch.randn(2, 3, 224, 224) # Batch 2, 3 channels, 224x224
                output = model(dummy_input)
                expected_shape = (2, 10)
            elif sample_name == "ResNetBlock":
                dummy_input = torch.randn(2, 3, 224, 224)
                output = model(dummy_input)
                expected_shape = (2, 64, 224, 224)
            else:
                return True

            if output.shape != expected_shape:
                print(f"[{sample_name}] Output shape mismatch: expected {expected_shape}, got {output.shape}")
                return False
            
            print(f"[{sample_name}] Forward pass verification PASSED! Shape: {output.shape}")
            return True
        except Exception as e:
            print(f"[{sample_name}] Runtime verification failed with error: {e}")
            return False

def main():
    print("Starting ArchNet Compiler Code Verification Suite...")
    all_passed = True
    for name, code in SAMPLES.items():
        print(f"\nVerifying Sample: {name}")
        # Verify syntax
        if not verify_syntax(code):
            print(f"[{name}] Syntax check: FAILED")
            all_passed = False
            continue
        print(f"[{name}] Syntax check: PASSED")

        # Verify runtime forward pass
        if not verify_runtime(code, name):
            all_passed = False

    if all_passed:
        print("\nAll compilation validation checks completed successfully!")
        sys.exit(0)
    else:
        print("\nSome validation checks failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
