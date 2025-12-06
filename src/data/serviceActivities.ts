interface SubActivity {
  id: string;
  name: string;
  estimatedHours: number;
}

interface Activity {
  id: string;
  name: string;
  estimatedHours: number;
  subActivities: SubActivity[];
}

interface ServiceActivities {
  [serviceOfferingId: string]: Activity[];
}

// Mapping of service offering IDs to their corresponding activities and sub-activities
export const SERVICE_ACTIVITIES: ServiceActivities = {
  // JIRA
  '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19': [
    {
      id: 'project-setup',
      name: 'Project Setup',
      estimatedHours: 24,
      subActivities: [
        { id: 'create-project', name: 'Create JIRA Project', estimatedHours: 4 },
        { id: 'configure-workflows', name: 'Configure Workflows', estimatedHours: 8 },
        { id: 'setup-permissions', name: 'Setup Permissions', estimatedHours: 6 },
        { id: 'create-custom-fields', name: 'Create Custom Fields', estimatedHours: 6 }
      ]
    },
    {
      id: 'issue-management',
      name: 'Issue Management',
      estimatedHours: 20,
      subActivities: [
        { id: 'issue-types', name: 'Configure Issue Types', estimatedHours: 5 },
        { id: 'priority-schemes', name: 'Setup Priority Schemes', estimatedHours: 4 },
        { id: 'resolution-setup', name: 'Configure Resolutions', estimatedHours: 5 },
        { id: 'linking-issues', name: 'Setup Issue Linking', estimatedHours: 6 }
      ]
    },
    {
      id: 'reporting-dashboards',
      name: 'Reporting & Dashboards',
      estimatedHours: 28,
      subActivities: [
        { id: 'create-dashboards', name: 'Create Dashboards', estimatedHours: 10 },
        { id: 'setup-filters', name: 'Setup Filters', estimatedHours: 6 },
        { id: 'velocity-charts', name: 'Configure Velocity Charts', estimatedHours: 6 },
        { id: 'burndown-charts', name: 'Setup Burndown Charts', estimatedHours: 6 }
      ]
    },
    {
      id: 'integration',
      name: 'Integration & Automation',
      estimatedHours: 32,
      subActivities: [
        { id: 'confluence-integration', name: 'Confluence Integration', estimatedHours: 8 },
        { id: 'automation-rules', name: 'Setup Automation Rules', estimatedHours: 10 },
        { id: 'webhook-config', name: 'Configure Webhooks', estimatedHours: 6 },
        { id: 'api-integration', name: 'API Integration', estimatedHours: 8 }
      ]
    }
  ],
  
  // GitHub
  '982e276c-55d7-4e0e-a3d3-443bfff239c3': [
    {
      id: 'repository-setup',
      name: 'Repository Setup',
      estimatedHours: 16,
      subActivities: [
        { id: 'create-repo', name: 'Create Repository', estimatedHours: 3 },
        { id: 'branch-protection', name: 'Setup Branch Protection', estimatedHours: 4 },
        { id: 'access-control', name: 'Configure Access Control', estimatedHours: 5 },
        { id: 'repo-templates', name: 'Setup Repository Templates', estimatedHours: 4 }
      ]
    },
    {
      id: 'workflow-automation',
      name: 'Workflow Automation',
      estimatedHours: 40,
      subActivities: [
        { id: 'github-actions', name: 'Setup GitHub Actions', estimatedHours: 12 },
        { id: 'ci-cd-pipeline', name: 'Configure CI/CD Pipeline', estimatedHours: 14 },
        { id: 'automated-testing', name: 'Setup Automated Testing', estimatedHours: 8 },
        { id: 'deployment-automation', name: 'Configure Deployment Automation', estimatedHours: 6 }
      ]
    },
    {
      id: 'code-quality',
      name: 'Code Quality & Security',
      estimatedHours: 24,
      subActivities: [
        { id: 'code-scanning', name: 'Enable Code Scanning', estimatedHours: 6 },
        { id: 'security-advisories', name: 'Setup Security Advisories', estimatedHours: 5 },
        { id: 'dependency-management', name: 'Configure Dependency Management', estimatedHours: 7 },
        { id: 'pr-reviews', name: 'Setup PR Review Process', estimatedHours: 6 }
      ]
    }
  ],

  // Azure DevOps
  '42fc80db-66f9-4a11-888e-17ad7eba24e1': [
    {
      id: 'project-configuration',
      name: 'Project Configuration',
      estimatedHours: 20,
      subActivities: [
        { id: 'create-project', name: 'Create DevOps Project', estimatedHours: 4 },
        { id: 'team-setup', name: 'Setup Teams', estimatedHours: 6 },
        { id: 'area-paths', name: 'Configure Area Paths', estimatedHours: 5 },
        { id: 'iteration-paths', name: 'Setup Iteration Paths', estimatedHours: 5 }
      ]
    },
    {
      id: 'work-item-management',
      name: 'Work Item Management',
      estimatedHours: 26,
      subActivities: [
        { id: 'work-item-types', name: 'Configure Work Item Types', estimatedHours: 8 },
        { id: 'custom-fields', name: 'Create Custom Fields', estimatedHours: 6 },
        { id: 'workflow-states', name: 'Setup Workflow States', estimatedHours: 6 },
        { id: 'queries-charts', name: 'Create Queries & Charts', estimatedHours: 6 }
      ]
    },
    {
      id: 'build-release',
      name: 'Build & Release',
      estimatedHours: 36,
      subActivities: [
        { id: 'build-pipelines', name: 'Setup Build Pipelines', estimatedHours: 12 },
        { id: 'release-pipelines', name: 'Configure Release Pipelines', estimatedHours: 10 },
        { id: 'deployment-groups', name: 'Setup Deployment Groups', estimatedHours: 8 },
        { id: 'variable-groups', name: 'Configure Variable Groups', estimatedHours: 6 }
      ]
    }
  ],

  // GitHub Copilot
  '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e': [
    {
      id: 'setup-configuration',
      name: 'Setup & Configuration',
      estimatedHours: 18,
      subActivities: [
        { id: 'license-activation', name: 'License Activation', estimatedHours: 3 },
        { id: 'ide-integration', name: 'IDE Integration', estimatedHours: 6 },
        { id: 'user-onboarding', name: 'User Onboarding', estimatedHours: 5 },
        { id: 'policy-configuration', name: 'Policy Configuration', estimatedHours: 4 }
      ]
    },
    {
      id: 'team-enablement',
      name: 'Team Enablement',
      estimatedHours: 30,
      subActivities: [
        { id: 'training-sessions', name: 'Training Sessions', estimatedHours: 12 },
        { id: 'best-practices', name: 'Best Practices Guidelines', estimatedHours: 6 },
        { id: 'code-review-process', name: 'Code Review Process', estimatedHours: 6 },
        { id: 'productivity-metrics', name: 'Productivity Metrics', estimatedHours: 6 }
      ]
    },
    {
      id: 'optimization',
      name: 'Optimization & Monitoring',
      estimatedHours: 24,
      subActivities: [
        { id: 'usage-analytics', name: 'Usage Analytics', estimatedHours: 8 },
        { id: 'performance-tuning', name: 'Performance Tuning', estimatedHours: 6 },
        { id: 'feedback-collection', name: 'Feedback Collection', estimatedHours: 5 },
        { id: 'continuous-improvement', name: 'Continuous Improvement', estimatedHours: 5 }
      ]
    }
  ],

  // Default activities for other services
  'default': [
    {
      id: 'requirements-analysis',
      name: 'Requirements Analysis',
      estimatedHours: 24,
      subActivities: [
        { id: 'gather-requirements', name: 'Gather Requirements', estimatedHours: 8 },
        { id: 'analyze-requirements', name: 'Analyze Requirements', estimatedHours: 6 },
        { id: 'document-requirements', name: 'Document Requirements', estimatedHours: 5 },
        { id: 'validate-requirements', name: 'Validate Requirements', estimatedHours: 5 }
      ]
    },
    {
      id: 'solution-design',
      name: 'Solution Design',
      estimatedHours: 32,
      subActivities: [
        { id: 'architecture-design', name: 'Architecture Design', estimatedHours: 12 },
        { id: 'technical-specification', name: 'Technical Specification', estimatedHours: 8 },
        { id: 'implementation-plan', name: 'Implementation Plan', estimatedHours: 6 },
        { id: 'risk-assessment', name: 'Risk Assessment', estimatedHours: 6 }
      ]
    },
    {
      id: 'implementation',
      name: 'Implementation',
      estimatedHours: 48,
      subActivities: [
        { id: 'setup-configuration', name: 'Setup & Configuration', estimatedHours: 16 },
        { id: 'customization', name: 'Customization', estimatedHours: 14 },
        { id: 'integration', name: 'Integration', estimatedHours: 10 },
        { id: 'testing', name: 'Testing', estimatedHours: 8 }
      ]
    },
    {
      id: 'delivery-support',
      name: 'Delivery & Support',
      estimatedHours: 20,
      subActivities: [
        { id: 'user-training', name: 'User Training', estimatedHours: 8 },
        { id: 'documentation', name: 'Documentation', estimatedHours: 6 },
        { id: 'go-live-support', name: 'Go-Live Support', estimatedHours: 4 },
        { id: 'handover', name: 'Handover', estimatedHours: 2 }
      ]
    }
  ]
};

export const getActivitiesForServiceOffering = (serviceOfferingId: string): Activity[] => {
  return SERVICE_ACTIVITIES[serviceOfferingId] || SERVICE_ACTIVITIES['default'];
};