# postmangovsg-infra

Pulumi project for new Postman Email infrastructure. Existing SST stacks stay where they are. This project currently creates the security log bucket, VPC flow logs, and the prod Route 53 resolver query log config.

Do not run `pulumi up` from this draft until the team has confirmed the open questions in the pull request.

## Stacks

| Stack  | VPC                     | Bucket                           |
| ------ | ----------------------- | -------------------------------- |
| `stg`  | `vpc-006dc4e0a97146e40` | `postmangovsg-securitylogs-stg`  |
| `prod` | `vpc-0e71dfc6b3c022b7a` | `postmangovsg-securitylogs-prod` |

Region is `ap-southeast-1`. Both stacks expect AWS account `454894717801`.

## Preview

```bash
cd infra
npm ci
pulumi stack select stg
pulumi preview
pulumi stack select prod
pulumi preview
```

Use credentials for account `454894717801`. The program refuses any other account.
