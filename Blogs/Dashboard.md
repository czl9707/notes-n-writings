
```dataviewjs 
let pages = dv.pages('"Blogs/finished"');
dv.container.className += ' dataview-container'

for (let page of pages) {
	dv.el(
		"div", 
		`<img src="${page.cover_url}"/>${dv.fileLink(page.file.path, false, page.title)}`,
		{cls: "card-container"}
	);
}
```
