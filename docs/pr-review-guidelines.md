# Postman PR review guidelines

This document sets baseline standard for our PR reviews and serves as a mechanism to align individual postmangineer's expectations of a PR review, both from a reviewer's and am author's point of view.

## Principles

- Technical facts and data overrule opinions and personal preferences.
- Decisions should **always** been made through either solid engineering principles, and/or through empirical data. If there're multiple equally valid alternatives, reviewers should accept the author's preference.
- Any purely style points (i.e. whose no valid argument via engineering principles nor data) should be consistent with whatever that's in the codebase. If there's no previous style, accept the author's
- Over-communicate and always assume the best intentions of your counterparts in a code review exercise

## Key pointers

Suggestions on the baseline of activities that need to be carried out during a code review exercise

### For reviewers

- [ ] Make sure to understand the requirements thoroughly before start your review.
- [ ] For fairly complex features, pull the code to your local and test it out.
- [ ] Review code in this order of importance: feature correctness > code structure > nits & styles.
- [ ] Giving feedback on feature correctness should be similar to how bug reports are done, with clear explanations and screenshots (if GUI app feature), or sample request and response (if API feature).
- [ ] Giving feedback on code structure should be done in a single general comment on the PR with links to snippets of code that require special attentions if there are, instead of scattered comments along the PR.
- [ ] Feedback on nits and styles **must** be marked with `[nit]` . On the other hand, ensure that when you are making a `[nit]` it's really a nit and purely personal preferences without any possible engineering principles behind.

### For authors

- [ ] Keep your PRs small, ideally 400 and less LOC change. If the feature is larger than this but can't be incrementally merged and deployed, break them down into separate branches that could be sequentially reviewed and merged into a feature branch that will eventually go to production.
- [ ] Attach a demo video in your PR description wherever applicable and possible.
- [ ] Annotate your code before requesting for reviews. This either means commenting in the code if the context is required for future readers of the code, or commenting using Github PR review comment if the context is only required by the immediate reviewers.
- [ ] For discussion points that are going beyond 2 rounds of back-and-forth (i.e. not looking like it's getting resolved even with author's second reply), arrange a quick huddle with your reviewer to talk through to arrive at a mutual decision.
