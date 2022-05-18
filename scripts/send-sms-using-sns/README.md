## To run

Make sure to source the correct set of AWS environment credentials before running the script:

```
export AWS_ACCESS_KEY_ID=< value >
export AWS_SECRET_ACCESS_KEY=< value >
```

Example:

```bash
> cd scripts/send-sms-using-sns
> npm i
> node index.js --csvPath "path-to-csv-file.csv" --templatePath "path-to-template-file.txt" --senderId "sender" --dryrun true
> node index.js --csvPath "path-to-csv-file.csv" --templatePath "path-to-template-file.txt" --senderId "sender"
```

csvPath, templatePath, and senderId are **required**.

Refer to the examples folder for sample CSV and template files.
