## Fleeting Notes

``` base
filters:
  and:
    - file.inFolder("note/by/developer")
	- file.path.contains("drafts")
formulas:
  Note: link(file.basename, title)
  Title: link(file.basename, title)
views:
  - type: cards
    name: Drafts
    order:
      - formula.Title
    limit: 5
    cardSize: 300
```

## Blog Drafts

``` base
filters:
  and:
    - file.inFolder("blog/by")
	- file.path.contains("drafts")
formulas:
  Title: link(file, title)
properties:
  file.name:
    displayName: file name
views:
  - type: cards
    name: Drafts
    order:
      - formula.Title
    cardSize: 400
```

## Blogs Collection

``` base
filters:
  and:
    - file.inFolder("blog/by")
    - '!file.path.contains("drafts")'
formulas:
  Title: link(file, title)
properties:
  file.name:
    displayName: file name
views:
  - type: cards
    name: Published
    order:
      - title
      - created-date
      - last-updated-date
      - tags
      - featured
    sort:
      - property: featured
        direction: DESC
      - property: file.name
        direction: ASC
    limit: 4
    image: note.cover
    imageFit: ""
    imageAspectRatio: 0.6
    cardSize: 300
```

## Notes Collection

``` base
filters:
  and:
    - file.inFolder("note/by")
    - '!file.path.contains("drafts")'
formulas:
  Note: link(file.basename, title)
  Title: link(file.basename, title)
views:
  - type: table
    name: Table
    order:
      - formula.Note
      - tags
    sort:
      - property: file.mtime
        direction: DESC
    limit: 10
    columnSize:
      formula.Note: 268
      note.tags: 283

```
