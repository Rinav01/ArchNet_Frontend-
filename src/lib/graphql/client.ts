/**
 * ArchNet Frontend GraphQL API Connector
 * Provides live communication with the FastAPI Strawberry GraphQL Backend (http://127.0.0.1:8000/graphql)
 * and incorporates automated local sandbox fallbacks when the server is offline.
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';

export async function isBackendOnline(): Promise<boolean> {
  try {
    const origin = new URL(GRAPHQL_URL).origin;
    const res = await fetch(`${origin}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function graphqlRequest<T = any>(query: string, variables: any = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('archnet_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();
  
  if (body.errors) {
    const errorMsg = body.errors[0]?.message || 'GraphQL execution error';
    if (
      errorMsg.toLowerCase().includes('not authenticated') ||
      errorMsg.toLowerCase().includes('unauthorized') ||
      errorMsg.toLowerCase().includes('signature has expired')
    ) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('archnet_token');
        localStorage.removeItem('archnet_username');
        window.location.href = '/login';
      }
    }
    throw new Error(errorMsg);
  }

  return body.data;
}

// Queries
export const GET_PROJECTS = `
  query GetProjects {
    projects {
      id
      name
      framework
      description
      createdAt
      updatedAt
      totalParameterCount
      estimatedGpuMemoryMb
      nodes {
        id
      }
    }
  }
`;

export const GET_PROJECT_DETAILS = `
  query GetProjectDetails($id: ID!) {
    project(id: $id) {
      id
      name
      framework
      description
      createdAt
      updatedAt
      nodes {
        id
        type
        label
        positionX
        positionY
        config
        inputShape
        outputShape
      }
      edges {
        id
        fromNodeId
        toNodeId
      }
    }
  }
`;

// Mutations
export const SIGNUP = `
  mutation Signup($email: String!, $username: String!, $password: String!) {
    signup(email: $email, username: $username, password: $password) {
      token
      user {
        id
        username
        email
        preferences
      }
    }
  }
`;

export const GET_USER_PREFERENCES = `
  query GetUserPreferences {
    me {
      id
      preferences
    }
  }
`;

export const UPDATE_USER_PREFERENCES = `
  mutation UpdateUserPreferences($preferences: JSON!) {
    updateUserPreferences(preferences: $preferences) {
      id
      preferences
    }
  }
`;

export const LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

export const CREATE_PROJECT = `
  mutation CreateProject($name: String!, $description: String, $framework: String!) {
    createProject(name: $name, description: $description, framework: $framework) {
      id
      name
      framework
      description
      createdAt
      updatedAt
    }
  }
`;

export const ADD_NODE = `
  mutation AddNode($projectId: ID!, $type: String!, $label: String!, $position: PositionInput!, $config: JSON!) {
    addNode(projectId: $projectId, type: $type, label: $label, position: $position, config: $config) {
      id
      type
      label
      positionX
      positionY
      config
      inputShape
      outputShape
    }
  }
`;

export const ADD_EDGE = `
  mutation AddEdge($projectId: ID!, $fromNodeId: ID!, $toNodeId: ID!) {
    addEdge(projectId: $projectId, fromNodeId: $fromNodeId, toNodeId: $toNodeId) {
      id
      fromNodeId
      toNodeId
    }
  }
`;

export const DELETE_NODE = `
  mutation DeleteNode($projectId: ID!, $nodeId: ID!) {
    deleteNode(projectId: $projectId, nodeId: $nodeId)
  }
`;

export const DELETE_EDGE = `
  mutation DeleteEdge($projectId: ID!, $edgeId: ID!) {
    deleteEdge(projectId: $projectId, edgeId: $edgeId)
  }
`;

export const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const CLEAR_PROJECT_CANVAS = `
  mutation ClearProjectCanvas($projectId: ID!) {
    clearProjectCanvas(projectId: $projectId)
  }
`;

export const GENERATE_PYTORCH_CODE = `
  mutation GeneratePyTorchCode($projectId: ID!) {
    generatePytorchCode(projectId: $projectId)
  }
`;

export const VALIDATE_PROJECT_COMPILATION = `
  mutation ValidateProjectCompilation($projectId: ID!) {
    validateProjectCompilation(projectId: $projectId) {
      success
      semanticErrors
      compatibilityErrors
      compilationErrors
      generatedCode
      executionLogs
    }
  }
`;

export const TRIGGER_TRAINING_JOB = `
  mutation TriggerTrainingJob($projectId: ID!, $epochs: Int!, $datasetId: ID) {
    triggerTrainingJob(projectId: $projectId, epochs: $epochs, datasetId: $datasetId)
  }
`;

export const GET_TRAINING_JOB = `
  query GetTrainingJob($id: ID!) {
    trainingJob(id: $id) {
      id
      projectId
      datasetId
      status
      epochs
      currentEpoch
      lossHistory
      accuracyHistory
      metricsMetadata
      createdAt
      updatedAt
    }
  }
`;

export const GET_DATASETS = `
  query GetDatasets {
    datasets {
      id
      name
      datasetType
      status
      numRecords
      description
      schemaMetadata
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_DATASET = `
  mutation CreateDataset($name: String!, $datasetType: String!, $filename: String!, $description: String) {
    createDataset(name: $name, datasetType: $datasetType, filename: $filename, description: $description) {
      dataset {
        id
        name
        datasetType
        status
        numRecords
        description
        schemaMetadata
      }
      uploadUrl
    }
  }
`;

export const TRIGGER_DATASET_PROCESSING = `
  mutation TriggerDatasetProcessing($datasetId: ID!) {
    triggerDatasetProcessing(datasetId: $datasetId)
  }
`;

export const EXPORT_ONNX = `
  mutation ExportOnnx($projectId: ID!) {
    exportOnnx(projectId: $projectId) {
      id
      projectId
      framework
      artifactPath
      checksum
      createdAt
    }
  }
`;

export const SCORE_ARCHITECTURE = `
  query ScoreArchitecture($projectId: ID!) {
    scoreArchitecture(projectId: $projectId) {
      score
      grade
      breakdown
    }
  }
`;

export const RECOMMEND_ARCHITECTURE = `
  query RecommendArchitecture($projectId: ID!) {
    recommendArchitecture(projectId: $projectId) {
      severity
      bottleneck
      recommendedAction
    }
  }
`;

export const GET_DEPLOYMENTS = `
  query GetDeployments($projectId: ID!) {
    deployments(projectId: $projectId) {
      id
      projectId
      modelArtifactId
      target
      status
      endpointUrl
      createdAt
      updatedAt
    }
  }
`;

export const DEPLOY_MODEL = `
  mutation DeployModel($artifactId: ID!, $target: String!) {
    deployModel(artifactId: $artifactId, target: $target) {
      id
      projectId
      modelArtifactId
      target
      status
      endpointUrl
      createdAt
    }
  }
`;

export const REGISTER_MODEL = `
  mutation RegisterModel($projectId: ID!, $name: String!, $description: String) {
    registerModel(projectId: $projectId, name: $name, description: $description) {
      id
      projectId
      name
      description
      createdAt
    }
  }
`;

export const GET_EXPERIMENTS = `
  query GetExperiments($projectId: ID!) {
    experiments(projectId: $projectId) {
      id
      projectId
      name
      description
      createdAt
      updatedAt
      trainingRuns {
        id
        project_id
        trainingJobId
        accuracy
        loss
        metricsJson
        configJson
        createdAt
      }
    }
  }
`;

export const CREATE_EXPERIMENT = `
  mutation CreateExperiment($projectId: ID!, $name: String!, $description: String) {
    createExperiment(projectId: $projectId, name: $name, description: $description) {
      id
      projectId
      name
      description
      createdAt
    }
  }
`;

export const ADD_RUN_TO_EXPERIMENT = `
  mutation AddRunToExperiment($experimentId: ID!, $runId: ID!) {
    addRunToExperiment(experimentId: $experimentId, runId: $runId) {
      id
      projectId
      trainingJobId
      accuracy
      loss
    }
  }
`;

export const GET_DEPLOYMENT_METRICS = `
  query GetDeploymentMetrics($deploymentId: ID!) {
    deploymentMetrics(deploymentId: $deploymentId) {
      id
      timestamp
      requestsCount
      latencyMs
      errorCount
      memoryMb
      gpuUsagePct
    }
  }
`;

export const GET_WORKFLOWS = `
  query GetWorkflows($projectId: ID) {
    workflows(projectId: $projectId) {
      id
      projectId
      name
      triggerEvent
      actionType
      config
      isActive
      createdAt
    }
  }
`;

export const CREATE_WORKFLOW = `
  mutation CreateWorkflow($projectId: ID, $name: String!, $triggerEvent: String!, $actionType: String!, $config: JSON!) {
    createWorkflow(projectId: $projectId, name: $name, triggerEvent: $triggerEvent, actionType: $actionType, config: $config) {
      id
      projectId
      name
      triggerEvent
      actionType
      config
      isActive
    }
  }
`;

export const DELETE_WORKFLOW = `
  mutation DeleteWorkflow($workflowId: ID!) {
    deleteWorkflow(workflowId: $workflowId)
  }
`;

export const ESTIMATE_COSTS = `
  query EstimateCosts($projectId: ID!, $datasetId: ID, $epochs: Int, $gpuType: String) {
    estimateCosts(projectId: $projectId, datasetId: $datasetId, epochs: $epochs, gpuType: $gpuType) {
      trainingCost
      inferenceCostPerMillion
      gpuHourlyCost
      storageMonthlyCost
      estimatedTrainingTimeHours
      estimatedInferenceLatencyMs
    }
  }
`;

export const EXECUTE_NOTEBOOK_CELL = `
  mutation ExecuteNotebookCell($projectId: ID!, $code: String!) {
    executeNotebookCell(projectId: $projectId, code: $code) {
      success
      stdout
      stderr
      executionTimeMs
    }
  }
`;

export const GET_REGISTERED_MODELS = `
  query GetRegisteredModels($projectId: ID!) {
    registeredModels(projectId: $projectId) {
      id
      projectId
      name
      description
      createdAt
      versions {
        id
        version
        description
        status
        modelArtifactId
        metrics
        config
        compilerOutput
        createdAt
      }
    }
  }
`;

export const PROMOTE_MODEL_VERSION = `
  mutation PromoteModelVersion($versionId: ID!, $status: String!) {
    promoteModelVersion(versionId: $versionId, status: $status) {
      id
      modelId
      version
      status
    }
  }
`;

export const GET_TRAINING_RUNS = `
  query GetTrainingRuns($projectId: ID!) {
    trainingRuns(projectId: $projectId) {
      id
      accuracy
      loss
      createdAt
    }
  }
`;

export const DELETE_DATASET = `
  mutation DeleteDataset($id: ID!) {
    deleteDataset(id: $id)
  }
`;



