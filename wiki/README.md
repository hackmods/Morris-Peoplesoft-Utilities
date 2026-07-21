# Wiki sources

Markdown in this folder is the source of truth for the GitHub Wiki.

To publish after cloning:

```bash
git clone https://github.com/hackmods/Morris-Peoplesoft-Utilities.wiki.git
cp wiki/*.md Morris-Peoplesoft-Utilities.wiki/
cd Morris-Peoplesoft-Utilities.wiki
git add .
git commit -m "docs: sync wiki from repository wiki/ sources"
git push
```

GitHub creates the wiki repo on first wiki page creation in the UI if it does not exist yet.
