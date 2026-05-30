/**
 * MLBuilder Frontend GraphQL API Connector
 * Provides live communication with the FastAPI Strawberry GraphQL Backend (http://localhost:8000/graphql)
 * and incorporates automated local sandbox fallbacks when the server is offline.
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql';

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('mlbuilder_token') : null;
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
    throw new Error(body.errors[0]?.message || 'GraphQL execution error');
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
      }
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



