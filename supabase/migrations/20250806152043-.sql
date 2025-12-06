-- Add generic sub-activities for remaining tools

-- JUnit Activities
-- Test Framework Setup
INSERT INTO sub_activities (activity_id, name, estimated_hours, display_order, service_offering_id, associated_tool)
VALUES 
('25f0c00a-aa1c-4100-9181-f563f869c056', 'JUnit Dependencies Setup', 1, 1, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('25f0c00a-aa1c-4100-9181-f563f869c056', 'Test Configuration', 2, 2, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('25f0c00a-aa1c-4100-9181-f563f869c056', 'IDE Integration Setup', 1, 3, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),

-- Unit Test Development
('056cce3b-ccb0-4ada-957d-cab7a0f8385a', 'Test Plan Creation', 3, 1, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('056cce3b-ccb0-4ada-957d-cab7a0f8385a', 'Test Cases Implementation', 8, 2, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('056cce3b-ccb0-4ada-957d-cab7a0f8385a', 'Mock Objects Setup', 3, 3, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('056cce3b-ccb0-4ada-957d-cab7a0f8385a', 'Test Coverage Analysis', 2, 4, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),

-- Test Execution & Reporting
('bb92b65a-e1b3-458b-9e7a-d6bb827529b0', 'Test Execution Configuration', 2, 1, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('bb92b65a-e1b3-458b-9e7a-d6bb827529b0', 'Automated Test Runs', 3, 2, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('bb92b65a-e1b3-458b-9e7a-d6bb827529b0', 'Test Report Generation', 2, 3, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),
('bb92b65a-e1b3-458b-9e7a-d6bb827529b0', 'Performance Testing Integration', 3, 4, 'b3fe2ec0-d8ee-4cac-856c-af994fd21bf5', 'JUnit'),

-- NUnit Activities  
-- NUnit Framework Setup
('1e5b7c8a-9f2d-4a3b-8c1e-5f6a7b8c9d0e', '.NET Test Project Setup', 2, 1, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('1e5b7c8a-9f2d-4a3b-8c1e-5f6a7b8c9d0e', 'NUnit Package Installation', 1, 2, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('1e5b7c8a-9f2d-4a3b-8c1e-5f6a7b8c9d0e', 'Test Runner Configuration', 2, 3, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),

-- .NET Unit Test Development  
('2f6c8d9b-1a3e-5b4c-9d2f-6a7b8c9d0e1f', 'Test Suite Design', 3, 1, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('2f6c8d9b-1a3e-5b4c-9d2f-6a7b8c9d0e1f', 'Unit Test Implementation', 8, 2, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('2f6c8d9b-1a3e-5b4c-9d2f-6a7b8c9d0e1f', 'Test Data Management', 3, 3, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('2f6c8d9b-1a3e-5b4c-9d2f-6a7b8c9d0e1f', 'Assertion Strategy', 2, 4, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),

-- Test Automation & CI/CD
('3a7d0e1c-2b4f-6c5d-0e3a-7b8c9d0e1f2a', 'Build Integration', 3, 1, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('3a7d0e1c-2b4f-6c5d-0e3a-7b8c9d0e1f2a', 'Continuous Testing Setup', 4, 2, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('3a7d0e1c-2b4f-6c5d-0e3a-7b8c9d0e1f2a', 'Test Results Publishing', 2, 3, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),
('3a7d0e1c-2b4f-6c5d-0e3a-7b8c9d0e1f2a', 'Test Failure Notifications', 1, 4, 'b70c7727-d4d4-426c-bd00-ea5c0f295738', 'NUnit'),

-- SonarQube Activities
-- SonarQube Installation & Setup
('4b8e1f2d-3c5a-7d6e-1f4b-8c9d0e1f2a3b', 'Server Installation', 4, 1, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('4b8e1f2d-3c5a-7d6e-1f4b-8c9d0e1f2a3b', 'Database Configuration', 2, 2, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('4b8e1f2d-3c5a-7d6e-1f4b-8c9d0e1f2a3b', 'Initial System Configuration', 2, 3, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),

-- Code Quality Analysis Setup
('5c9f2a3e-4d6b-8e7f-2a5c-9d0e1f2a3b4c', 'Quality Profiles Configuration', 3, 1, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('5c9f2a3e-4d6b-8e7f-2a5c-9d0e1f2a3b4c', 'Rule Set Customization', 4, 2, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('5c9f2a3e-4d6b-8e7f-2a5c-9d0e1f2a3b4c', 'Quality Gates Setup', 3, 3, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('5c9f2a3e-4d6b-8e7f-2a5c-9d0e1f2a3b4c', 'Project Analysis Configuration', 2, 4, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),

-- Integration & Reporting
('6d0a3b4f-5e7c-9f8a-3b6d-0e1f2a3b4c5d', 'CI/CD Pipeline Integration', 4, 1, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('6d0a3b4f-5e7c-9f8a-3b6d-0e1f2a3b4c5d', 'Scanner Configuration', 3, 2, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('6d0a3b4f-5e7c-9f8a-3b6d-0e1f2a3b4c5d', 'Dashboard Configuration', 3, 3, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('6d0a3b4f-5e7c-9f8a-3b6d-0e1f2a3b4c5d', 'Reporting and Notifications', 2, 4, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),

-- Security & Maintenance
('7e1b4c5a-6f8d-0a9b-4c7e-1f2a3b4c5d6e', 'Security Configuration', 3, 1, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('7e1b4c5a-6f8d-0a9b-4c7e-1f2a3b4c5d6e', 'User Management Setup', 2, 2, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('7e1b4c5a-6f8d-0a9b-4c7e-1f2a3b4c5d6e', 'Backup and Maintenance', 2, 3, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube'),
('7e1b4c5a-6f8d-0a9b-4c7e-1f2a3b4c5d6e', 'Performance Optimization', 3, 4, '67101b4e-2b7c-4775-894d-15ddf323bac0', 'SonarQube');