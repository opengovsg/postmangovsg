## Preparing the db with mock data

`node reset.js -d postgres://localhost:5432/postmangovsg`

```
Usage: reset [options]

Options:
  -d, --database <uri>               database uri
  -c, --num-creds <creds>            number of credentials (default: 10)
  -p, --num-campaigns <campaigns>    number of campaigns per credential (default: 2)
  -w, --num-workers <workers>        number of workers (default: 3)
  -r, --num-recipients <recipients>  number of recipients per campaign (default: 1000)
  -j, --jobs                         set flag to insert all jobs (default: false)
  -i, --campaign-id <campaign-id>    insert a single job for this campaign. Overrides all other opts
  -h, --help                         display help for command
```

## Running workers
```
Usage: index [options]

Options:
  -w, --worker-id <worker-id>    id of worker
  -d, --database <uri>           database uri
  -s, --batch-size <batch-size>  number of messages to send per second (default: 10)
  -r, --grim-reaper              set this flag for grim reaper mode
  -v, --verbose                  set this flag true for verbose
  -h, --help                     display help for command
```


**Enqueue + send worker** 

`node index.js -w 1 -d "postgres://localhost:5432/postmangovsg"`

**Logger worker**

`node index.js -r -w 2 -d "postgres://localhost:5432/postmangovsg"`

