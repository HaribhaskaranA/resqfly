import os, boto3

env_vars = {}
with open('C:/Users/HARIBHASKARAN A/.gemini/antigravity/scratch/resqfly/backend/.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

session = boto3.Session(
    aws_access_key_id=env_vars.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=env_vars.get('AWS_SECRET_ACCESS_KEY'),
    region_name=env_vars.get('AWS_REGION', 'ap-southeast-2')
)

regions = ['ap-southeast-2', 'us-east-1', 'ap-south-1', 'us-west-2']
for r in regions:
    try:
        client = session.client('dynamodb', region_name=r)
        tables = client.list_tables()['TableNames']
        print(f"Region {r}: {tables}")
    except Exception as e:
        print(f"Region {r} error: {e}")
