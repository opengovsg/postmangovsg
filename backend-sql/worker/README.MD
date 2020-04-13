## Preparing the db with mock data

`node db/index.js -d postgres://localhost:5432/postmangovsg`

```
Usage: index [options]

Options:
  -d, --database <uri>               database uri
  -f, --dir <function directory>     path to sql functions (default: "../../sql/functions")
  -c, --num-creds <creds>            number of credentials (default: 10)
  -p, --num-campaigns <campaigns>    number of campaigns per credential (default: 2)
  -w, --num-workers <workers>        number of workers (default: 3)
  -r, --num-recipients <recipients>  number of recipients per campaign (default: 1000)
  -j, --jobs                         set flag to insert all jobs (default: false)
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

## Inserting / stopping / retrying campaigns

```
Usage: campaign [options]

Options:
  -d, --database <uri>             database uri
  -i, --campaign-id <campaign-id>  call a method for this campaign
  -m, --method <method>            method to be called <start|stop|retry>
  -h, --help                       display help for command
```

**Inserting a job for campaign 5**

`node db/campaign.js -d postgres://localhost:5432/postmangovsg -i 5 -m start`

**Stopping all jobs for campaign 5**

`node db/campaign.js -d postgres://localhost:5432/postmangovsg -i 5 -m stop`

**Retrying all jobs for campaign 5**

`node db/campaign.js -d postgres://localhost:5432/postmangovsg -i 5 -m retry`