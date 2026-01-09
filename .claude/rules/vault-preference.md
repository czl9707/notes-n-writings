# Vault Preferred Format

## Vault Structure

This is a personal notes and blog vault organized as follows:

### Directory Structure

- `/blog` - Published and draft blog articles
- `/note` - Technical notes and learning materials
- `/Fleeting` - Quick, temporary notes
- `/Media` - Visual assets (covers, diagrams)
  - `/Media/Covers` - SVG artwork for blog posts
- `/Templates` - Templates for creating new content
- `Home.md` - Central hub with database views
- `Related.base` - Obsidian Base for related content

### Organizational Patterns

**By Author/Perspective:**

- `/by/developer` - Technical/programming focused content
- `/by/christian` - Faith/spiritual reflections
- `/by/human-being` - General life philosophy

**By Publication Status:**

- Published files sit directly in author directories
- `drafts/` subdirectory for work-in-progress content

### Frontmatter Templates

Don't worry about the frontmatter, it should be handled by "templater" plugin.

### File Naming

- Use lowercase with underscores (snake_case)
- Descriptive, readable names (e.g., `database_index.md`)
- No emojis in filenames

## Links Style

- Always use standard link style, no `[[file]]` or `[[file|name]]` format, always use `[name](path/to/file.md#block)`.
- Always use full path relative to the vault root, with extension included, for example `path/to/file.md`.
