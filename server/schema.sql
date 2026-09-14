-- PostgreSQL Database Schema for QA Hub

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(255) NOT NULL,
  module VARCHAR(100),
  ticket_id VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Open',
  priority VARCHAR(50) DEFAULT 'Medium',
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) NOT NULL,
  tc_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  module VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Draft',
  priority VARCHAR(50) DEFAULT 'Medium',
  description TEXT,
  pre_conditions TEXT,
  steps TEXT,
  expected_result TEXT,
  actual_result TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_case_headers (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) UNIQUE NOT NULL,
  total_scenarios INT DEFAULT 0,
  total_test_cases INT DEFAULT 0,
  passed INT DEFAULT 0,
  failed INT DEFAULT 0,
  blocked INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) NOT NULL,
  obs_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  module VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Open',
  severity VARCHAR(50) DEFAULT 'Medium',
  description TEXT,
  steps_to_reproduce TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS developer_testing (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) NOT NULL,
  dev_tc_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  developer_notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default users if not existing
INSERT INTO users (name, role, email) VALUES
  ('Maseera Sayyed', 'Super Admin', 'maseera@company.com'),
  ('QA User', 'QA', 'qa@company.com'),
  ('BA User', 'BA', 'ba@company.com'),
  ('Developer User', 'Developer', 'dev@company.com'),
  ('Product User', 'Product Team', 'product@company.com')
ON CONFLICT (name) DO NOTHING;
