#!/bin/sh

against=HEAD

# Redirect output to stderr.
exec 1>&2

UNQUOTED=$(git diff --name-only --staged -z $against -- '*.env*' | xargs -0 cat | perl -nle'print $& if m{^(?!(.*=(["\x27]).*(\2)))(.*=.*)$}')

if [ "$UNQUOTED" != "" ]; then
  echo
  echo "Unquoted values found in staged dotenv files."
  echo "All values need to be quoted in order for detect-secrets to identify possible secrets."
  echo
  echo "Please check the following file(s):"
  git diff --name-only --staged -z $against -- '*.env*' | xargs -0 -n1 printf " - %s\n"
  echo

  exit 1
fi

exit 0