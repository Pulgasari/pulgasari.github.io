# Reset the Commit History of a GitHub Repository

Keep the files as they are now, throw away every commit before: the repository starts over with one commit.

* [before you start](#before-you-start)
* [the way: an orphan branch](#the-way-an-orphan-branch)
* [other branches and tags](#other-branches-and-tags)
* [everyone else](#everyone-else)
* [without a computer](#without-a-computer)
* [what stays anyway](#what-stays-anyway)
* [only one file out of the history](#only-one-file-out-of-the-history)

---

## before you start

* this can not be undone once pushed. a backup first:

```sh
git clone --mirror https://github.com/USER/REPO.git REPO-backup.git
```

* a protected branch refuses a force push: **Settings → Branches** (or **Rules → Rulesets**), allow force pushes for the moment.
* open pull requests lose their base: merge or close them first.

## the way: an orphan branch

An orphan branch has no parent: its first commit is the start of a new history.

```sh
git clone https://github.com/USER/REPO.git
cd REPO

git checkout --orphan fresh      # a branch without history, the files stay
git add -A
git commit -m "initial commit"

git branch -D main               # the old main, gone locally
git branch -m main               # fresh becomes main
git push --force origin main     # and on github
```

`main` is the default branch here; use yours (`master` …).

**Variant**: keep the date and message of the very first commit, squash everything else into it:

```sh
git reset --soft $(git rev-list --max-parents=0 HEAD)
git commit --amend -m "initial commit"
git push --force origin main
```

## other branches and tags

Every other branch and every tag still holds the old commits. Delete what is not needed:

```sh
git push origin --delete old-feature        # a branch
git push origin --delete v1.0.0             # a tag
git tag -l | xargs -n 1 git push origin --delete   # every tag
```

Releases on GitHub hang on tags: delete them under **Releases** as well.

## everyone else

Every clone still has the old history, and a push from it would bring it back. Each clone either starts over:

```sh
git fetch origin
git reset --hard origin/main
git gc --prune=now
```

or is cloned again.

## without a computer

GitHub's web interface can not rewrite history. Two ways around it:

* **Codespaces**: on the repository **Code → Codespaces → Create codespace**, then the commands above in its terminal. github.dev (the `.` key) has no terminal and does not work.
* **a new repository**: delete the old one (**Settings → Danger Zone**), create one with the same name, upload the files. Issues, stars, settings and secrets are gone with it.

## what stays anyway

* **forks** keep the old history, out of your hands.
* **commits by hash**: GitHub keeps unreachable commits for a while, a direct link to one may still work. for sensitive data ask GitHub Support to purge the cached views.
* **a leaked secret** (a token, a password) is compromised the moment it was pushed: revoke and replace it, a reset does not help.

## only one file out of the history

To remove a single file (a secret, a large binary) and keep the rest of the history, use [git filter-repo](https://github.com/newren/git-filter-repo):

```sh
git filter-repo --invert-paths --path secrets.env
git remote add origin https://github.com/USER/REPO.git   # filter-repo drops the remote, on purpose
git push --force --all
git push --force --tags
```
