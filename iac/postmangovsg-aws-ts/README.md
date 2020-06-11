# Postmangovsg Pulumi Config

## Install pulumi

```sh
brew install pulumi
```

## Set your AWS profile

```sh
pulumi config set aws:profile <profilename>
```

## Set up the infra

```
cd postmangovsg-aws-ts
pulumi up
```