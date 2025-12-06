-- Add generic sub-activities for Azure DevOps activities
INSERT INTO sub_activities (activity_id, name, estimated_hours, display_order, service_offering_id, associated_tool)
VALUES 
-- Project Setup & Configuration (Azure DevOps)
('74a67810-d69a-4655-9803-65b6d525a14a', 'Initial Environment Setup', 2, 1, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('74a67810-d69a-4655-9803-65b6d525a14a', 'Organization Configuration', 3, 2, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('74a67810-d69a-4655-9803-65b6d525a14a', 'Team Setup and Permissions', 2, 3, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('74a67810-d69a-4655-9803-65b6d525a14a', 'Project Templates Configuration', 1, 4, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),

-- Build Pipeline Implementation (Azure DevOps)
('cf2dddff-a7ab-4f74-a0cf-cbf03379b7b7', 'Pipeline Definition', 4, 1, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('cf2dddff-a7ab-4f74-a0cf-cbf03379b7b7', 'Source Control Integration', 3, 2, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('cf2dddff-a7ab-4f74-a0cf-cbf03379b7b7', 'Build Triggers Setup', 2, 3, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('cf2dddff-a7ab-4f74-a0cf-cbf03379b7b7', 'Agent Configuration', 3, 4, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('cf2dddff-a7ab-4f74-a0cf-cbf03379b7b7', 'Testing and Validation', 4, 5, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),

-- Release Pipeline Setup (Azure DevOps)
('f32d0605-6def-43ba-9949-14cec0ba32c1', 'Release Strategy Definition', 3, 1, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('f32d0605-6def-43ba-9949-14cec0ba32c1', 'Environment Configuration', 4, 2, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('f32d0605-6def-43ba-9949-14cec0ba32c1', 'Approval Gates Setup', 3, 3, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('f32d0605-6def-43ba-9949-14cec0ba32c1', 'Deployment Scripts', 2, 4, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('f32d0605-6def-43ba-9949-14cec0ba32c1', 'Release Testing', 2, 5, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),

-- Testing Integration (Azure DevOps)
('34e0e0bc-e5eb-454b-9e56-64868edbae59', 'Test Framework Setup', 3, 1, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('34e0e0bc-e5eb-454b-9e56-64868edbae59', 'Test Automation Configuration', 4, 2, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),
('34e0e0bc-e5eb-454b-9e56-64868edbae59', 'Test Reporting Setup', 3, 3, '42fc80db-66f9-4a11-888e-17ad7eba24e1', 'Azure DevOps'),

-- GitHub Activities
-- Repository Setup & Configuration
('d5fa7cb6-2f63-4532-8a31-989419732596', 'Repository Creation', 2, 1, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('d5fa7cb6-2f63-4532-8a31-989419732596', 'Initial Commit Structure', 2, 2, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('d5fa7cb6-2f63-4532-8a31-989419732596', 'README and Documentation', 2, 3, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('d5fa7cb6-2f63-4532-8a31-989419732596', 'Repository Settings Configuration', 2, 4, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),

-- Branch Strategy Implementation
('a58e9ee2-6838-4f7f-b26b-b6d420aeb6fb', 'Branch Protection Rules', 3, 1, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('a58e9ee2-6838-4f7f-b26b-b6d420aeb6fb', 'Merge Strategy Configuration', 3, 2, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('a58e9ee2-6838-4f7f-b26b-b6d420aeb6fb', 'Branch Naming Convention', 2, 3, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('a58e9ee2-6838-4f7f-b26b-b6d420aeb6fb', 'Pull Request Templates', 2, 4, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('a58e9ee2-6838-4f7f-b26b-b6d420aeb6fb', 'Code Review Guidelines', 2, 5, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),

-- Security & Access Management
('2f5ae6b0-985a-463c-9109-83c28ae16d8d', 'Team Permissions Setup', 2, 1, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('2f5ae6b0-985a-463c-9109-83c28ae16d8d', 'Security Policies Configuration', 2, 2, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('2f5ae6b0-985a-463c-9109-83c28ae16d8d', 'Secret Management Setup', 2, 3, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),

-- Workflow & Automation Setup
('ae2acc10-2fd5-4a03-acc2-5894e34b12fe', 'GitHub Actions Configuration', 4, 1, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('ae2acc10-2fd5-4a03-acc2-5894e34b12fe', 'CI/CD Pipeline Setup', 6, 2, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('ae2acc10-2fd5-4a03-acc2-5894e34b12fe', 'Automated Testing Integration', 3, 3, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),
('ae2acc10-2fd5-4a03-acc2-5894e34b12fe', 'Deployment Automation', 3, 4, '982e276c-55d7-4e0e-a3d3-443bfff239c3', 'GitHub'),

-- GitHub Copilot Activities
-- Copilot Setup & Configuration
('4ed07025-646a-4b88-b3ed-9c61b28278fd', 'License Setup', 1, 1, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('4ed07025-646a-4b88-b3ed-9c61b28278fd', 'IDE Integration', 2, 2, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('4ed07025-646a-4b88-b3ed-9c61b28278fd', 'User Access Configuration', 1, 3, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),

-- Team Training & Best Practices
('a3b2e327-fbeb-4f8c-9490-6270cffac296', 'Initial Training Sessions', 4, 1, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('a3b2e327-fbeb-4f8c-9490-6270cffac296', 'Best Practices Documentation', 3, 2, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('a3b2e327-fbeb-4f8c-9490-6270cffac296', 'Hands-on Workshops', 3, 3, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('a3b2e327-fbeb-4f8c-9490-6270cffac296', 'Q&A and Support', 2, 4, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),

-- Productivity Measurement
('4e6c96e6-5474-42f6-b7a8-de6630d32d5a', 'Baseline Metrics Collection', 2, 1, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('4e6c96e6-5474-42f6-b7a8-de6630d32d5a', 'Analytics Dashboard Setup', 3, 2, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('4e6c96e6-5474-42f6-b7a8-de6630d32d5a', 'Performance Reporting', 2, 3, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('4e6c96e6-5474-42f6-b7a8-de6630d32d5a', 'ROI Analysis', 1, 4, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),

-- Custom Model Integration
('f5996199-3080-496a-8bdc-4977592e0fa0', 'Model Requirements Analysis', 2, 1, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('f5996199-3080-496a-8bdc-4977592e0fa0', 'Custom Model Development', 4, 2, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('f5996199-3080-496a-8bdc-4977592e0fa0', 'Integration Testing', 2, 3, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot'),
('f5996199-3080-496a-8bdc-4977592e0fa0', 'Model Deployment', 2, 4, '4ff6d6f3-62e9-4669-8048-3fa6ac8bf84e', 'GitHub Copilot');

-- Jenkins Activities
-- Jenkins Installation & Configuration
INSERT INTO sub_activities (activity_id, name, estimated_hours, display_order, service_offering_id, associated_tool)
VALUES 
('c025ed9a-58a1-48f2-af0b-478abbb740bb', 'Server Installation', 3, 1, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('c025ed9a-58a1-48f2-af0b-478abbb740bb', 'Initial Configuration', 2, 2, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('c025ed9a-58a1-48f2-af0b-478abbb740bb', 'Security Setup', 3, 3, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('c025ed9a-58a1-48f2-af0b-478abbb740bb', 'Global Tool Configuration', 2, 4, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),

-- Pipeline Development
('dae803c6-e23d-4c90-992d-d67b5bba7f8e', 'Pipeline Design', 4, 1, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('dae803c6-e23d-4c90-992d-d67b5bba7f8e', 'Jenkinsfile Creation', 6, 2, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('dae803c6-e23d-4c90-992d-d67b5bba7f8e', 'Build Steps Configuration', 4, 3, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('dae803c6-e23d-4c90-992d-d67b5bba7f8e', 'Post-build Actions', 3, 4, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('dae803c6-e23d-4c90-992d-d67b5bba7f8e', 'Pipeline Testing', 3, 5, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),

-- Plugin Management & Integration
('6e35b185-e3a2-4416-a4a3-2f29df8652e9', 'Plugin Research and Selection', 2, 1, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('6e35b185-e3a2-4416-a4a3-2f29df8652e9', 'Plugin Installation', 2, 2, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('6e35b185-e3a2-4416-a4a3-2f29df8652e9', 'Plugin Configuration', 2, 3, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('6e35b185-e3a2-4416-a4a3-2f29df8652e9', 'Integration Testing', 2, 4, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),

-- Performance Optimization
('a80e82c7-9e1f-439c-b8f4-0899029c07d2', 'Performance Analysis', 3, 1, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('a80e82c7-9e1f-439c-b8f4-0899029c07d2', 'Resource Optimization', 4, 2, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('a80e82c7-9e1f-439c-b8f4-0899029c07d2', 'Build Optimization', 3, 3, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins'),
('a80e82c7-9e1f-439c-b8f4-0899029c07d2', 'Monitoring Setup', 2, 4, 'd0a9f4bf-8e67-49bf-8498-fedb67f16ba8', 'Jenkins');

-- JIRA Activities
-- Project & Issue Type Configuration
INSERT INTO sub_activities (activity_id, name, estimated_hours, display_order, service_offering_id, associated_tool)
VALUES 
('9c0f098e-b9fb-4ca1-a9b7-4a00e59fbe7c', 'Project Template Selection', 1, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9c0f098e-b9fb-4ca1-a9b7-4a00e59fbe7c', 'Issue Type Definition', 2, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9c0f098e-b9fb-4ca1-a9b7-4a00e59fbe7c', 'Custom Fields Setup', 2, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9c0f098e-b9fb-4ca1-a9b7-4a00e59fbe7c', 'Issue Type Scheme Configuration', 1, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Project Setup
('91db8963-7d16-4a30-95da-c61d6125253a', 'Project Creation', 2, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('91db8963-7d16-4a30-95da-c61d6125253a', 'User Management', 4, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('91db8963-7d16-4a30-95da-c61d6125253a', 'Permission Scheme Setup', 6, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('91db8963-7d16-4a30-95da-c61d6125253a', 'Notification Scheme Configuration', 4, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('91db8963-7d16-4a30-95da-c61d6125253a', 'Project Components Setup', 4, 5, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('91db8963-7d16-4a30-95da-c61d6125253a', 'Version Management', 4, 6, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Issue Management
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Issue Creation Templates', 4, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Issue Linking Configuration', 4, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Priority and Severity Setup', 3, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Issue Search and Filters', 4, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Bulk Operations Setup', 3, 5, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3a98d37f-b446-4829-a9e5-75b5f4db83b6', 'Issue History and Audit', 2, 6, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Workflow Design & Implementation
('9ef6ae2e-a0a8-41b9-83dc-8cfaf7171dfc', 'Workflow Analysis', 3, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9ef6ae2e-a0a8-41b9-83dc-8cfaf7171dfc', 'Custom Workflow Creation', 4, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9ef6ae2e-a0a8-41b9-83dc-8cfaf7171dfc', 'Transition Configuration', 3, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('9ef6ae2e-a0a8-41b9-83dc-8cfaf7171dfc', 'Workflow Testing', 2, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Dashboard & Reporting Setup
('13a2be99-840b-4fcf-959b-87d42479b5cf', 'Dashboard Planning', 2, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('13a2be99-840b-4fcf-959b-87d42479b5cf', 'Gadget Configuration', 3, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('13a2be99-840b-4fcf-959b-87d42479b5cf', 'Custom Filters Creation', 2, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('13a2be99-840b-4fcf-959b-87d42479b5cf', 'Dashboard Sharing Setup', 1, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Reporting & Dashboards
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Report Requirements Gathering', 4, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Standard Reports Configuration', 6, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Custom Report Development', 8, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Automated Report Scheduling', 4, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Report Distribution Setup', 3, 5, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('a12d6c21-2e88-4fbe-bacd-2d75c04e0d2f', 'Performance Metrics Dashboard', 3, 6, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Integration & Automation (First Instance - 32 hours)
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'Integration Requirements Analysis', 4, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'API Configuration', 8, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'Third-party Tool Integration', 8, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'Automation Rules Setup', 6, 4, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'Webhook Configuration', 4, 5, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('3b593ffd-8b51-4bbf-97eb-76878dfb3988', 'Integration Testing', 2, 6, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),

-- Integration & Automation (Second Instance - 10 hours)
('f08a3304-08a3-4940-a4d9-a74a21ee45fd', 'Basic Integration Setup', 3, 1, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('f08a3304-08a3-4940-a4d9-a74a21ee45fd', 'Simple Automation Rules', 4, 2, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA'),
('f08a3304-08a3-4940-a4d9-a74a21ee45fd', 'Basic Testing and Validation', 3, 3, '331b17d9-2dfc-4032-9cfd-e6c9a2bf9f19', 'JIRA');