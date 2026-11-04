"""AWS Lambda Function: Telemetry Processor.
Triggered by AWS IoT Core rule: SELECT * FROM 'resqfly/drone/+/telemetry'
"""
import json
import os
import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")

TABLE_PREFIX = os.environ.get("AWS_DYNAMODB_PREFIX", "resqfly")
drones_table = dynamodb.Table(f"{TABLE_PREFIX}-drones")

def lambda_handler(event, context):
    try:
        drone_id = event.get("id") or event.get("drone_id")
        if not drone_id:
            return {"statusCode": 400, "body": "Missing drone ID"}

        # 1. Update DynamoDB
        drones_table.update_item(
            Key={"id": drone_id},
            UpdateExpression="SET battery = :b, #pos = :p, #st = :s, last_telemetry_ts = :t",
            ExpressionAttributeNames={
                "#pos": "position",
                "#st": "status"
            },
            ExpressionAttributeValues={
                ":b": event.get("battery", 100.0),
                ":p": event.get("position", {}),
                ":s": event.get("status", "idle"),
                ":t": datetime.now(timezone.utc).isoformat()
            }
        )

        # 2. Put CloudWatch Metric
        cloudwatch.put_metric_data(
            Namespace="RESQFLY/Fleet",
            MetricData=[
                {
                    "MetricName": "DroneBatteryPercentage",
                    "Dimensions": [{"Name": "DroneID", "Value": drone_id}],
                    "Value": float(event.get("battery", 100.0)),
                    "Unit": "Percent"
                }
            ]
        )

        return {"statusCode": 200, "body": json.dumps({"status": "processed", "drone_id": drone_id})}
    except Exception as e:
        print(f"Error processing telemetry: {e}")
        return {"statusCode": 500, "body": str(e)}
