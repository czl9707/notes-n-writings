
```dataviewjs 
let pages = dv.pages('"as/developer/blog"');
dv.container.className += ' dataview-container'

for (let page of pages) {
	if (page.file.path.startsWith("as/developer/blog/drafts")) continue;
	dv.el(
		"div", 
		`<img src="${page.cover_url}"/>${dv.fileLink(page.file.path, false, page.title)}`,
		{cls: "card-container"}
	);
}
```
