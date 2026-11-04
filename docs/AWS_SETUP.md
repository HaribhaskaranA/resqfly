# AWS Setup Guide — RESQFLY

This guide provides step-by-step instructions for provisioning and configuring real AWS cloud infrastructure for **RESQFLY: Intelligent Multi-Drone Disaster Rescue & Relief System**.

---

## 1. Cloud Architecture Overview

RESQFLY leverages an AWS Serverless and IoT Core architecture:

1. **AWS IoT Core**:
   - MQTT Topic for drone telemetry: `resqfly/drone/{drone_id}/telemetry`
   - MQTT Topic for flight commands: `resqfly/drone/{drone_id}/command`
   - Topic rule filters incoming messages and triggers Lambda telemetry processors.

2. **Amazon DynamoDB**:
   - Stores fleet states (`resqfly-drones`), mission flight plans (`resqfly-missions`), shelter assessments (`resqfly-shelters`), and emergency SOS requests (`resqfly-requests`).

3. **AWS Lambda**:
   - `telemetry_processor`: Ingests MQTT payloads, updates DynamoDB, records CloudWatch metrics.
   - `mission_dispatcher`: Evaluates mission assignment and dispatches waypoints.
   - `alert_notifier`: Dispatches critical shelter breach alerts via SNS.

4. **Amazon S3**:
   - Encrypted bucket storing uploaded aerial footage and YOLO/OpenCV bounding-box evidence artifacts.

5. **Amazon Cognito**:
   - User pool with role-based authorization groups (`RescueCoordinator`, `OperationsAdministrator`, `FieldViewer`).

6. **Amazon CloudWatch**:
   - Logs and real-time metric alarms on drone battery levels and communication heartbeats.

7. **Amazon Bedrock (Optional)**:
   - Natural language generation of incident briefs and situational summaries via Anthropic Claude 3 Haiku / Titan.

---

## 2. Prerequisites

- AWS CLI v2 installed (`aws --version`)
- AWS SAM CLI or CloudFormation permissions
- Configured IAM credentials with administrator or scoped permissions:
  - `iot:*`
  - `dynamodb:*`
  - `lambda:*`
  - `s3:*`
  - `cognito-idp:*`
  - `cloudwatch:*`

---

## 3. Automated Deployment via AWS SAM

In the `aws/` directory of this repository:

```bash
cd aws

# 1. Build serverless functions
sam build

# 2. Deploy infrastructure
sam deploy --guided
```

Follow the prompts:
- Stack Name: `resqfly-stack`
- AWS Region: `us-east-1` (or your preferred region)
- Parameter TablePrefix: `resqfly`

---

## 4. Manual Configuration (Alternative)

### A. AWS IoT Core
1. Open the **AWS IoT Core Console**.
2. Go to **Settings** and copy your **Device Data Endpoint** (e.g., `xxxxxx-ats.iot.us-east-1.amazonaws.com`).
3. Set this endpoint in your `.env`:
   ```env
   AWS_IOT_ENDPOINT=xxxxxx-ats.iot.us-east-1.amazonaws.com
   ```
4. Create an IoT Rule named `resqfly_drone_telemetry`:
   - SQL: `SELECT * FROM 'resqfly/drone/+/telemetry'`
   - Action: Invoke Lambda function `resqfly-telemetry-processor`.

### B. DynamoDB Tables
Create 5 tables with On-Demand (PAY_PER_REQUEST) billing and partition key `id` (String):
- `resqfly-drones`
- `resqfly-missions`
- `resqfly-shelters`
- `resqfly-requests`
- `resqfly-alerts`

### C. Amazon S3
Create a private S3 bucket with Block Public Access enabled:
- Bucket Name: `resqfly-evidence-storage-<your-account-id>`

---

## 5. Dual-Mode Operation

RESQFLY is built with an **AWS Client Adapter**:

- **Local Simulation Mode (Default)**:
  When AWS credentials are not set in `.env`, the platform operates deterministically with an in-memory and simulated IoT bus. The UI shows a clear `LOCAL SIMULATION MODE` badge.

- **AWS-Connected Mode**:
  When valid credentials are provided, the adapter automatically routes MQTT telemetry, DynamoDB writes, and S3 evidence uploads to real AWS endpoints, switching the UI badge to `AWS IOT CONNECTED`.
