import enum
import logging
import pathlib
import os
import argparse
import yaml 
from typing import Generator

import requests

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

cms_url = os.environ.get("CMS_URL")
cms_apikey = os.environ.get("CMS_APIKEY")



class OperationType(enum.Enum):
    Create = enum.auto()
    Update = enum.auto()
    Delete = enum.auto()
    Noop = enum.auto()

class WritingType(enum.Enum):
    Blog = "ZaneBlog"
    Note = "ZaneNote"

GQL_getByID = """
query ($id: String!) {
  {slug}(id: $id) { id }
}
"""

GQL_deleteByID = """
mutation ($id: String!) {
  delete{slug}(id: $id)
}
"""

GQL_updateBlog = """
mutation (
    $id: String!, 
    $role: ZaneBlogUpdate_role_MutationInput!, 
    $title: String!, 
    $description: String!, 
    $content: String!, 
    $tags: [String!]!, 
    $createdDate: String!, 
    $lastUpdatedDate: String!, 
    $featured: Boolean!, 
    $cover: Int!,
    $hasLinkTo: [ZaneBlogUpdate_HasLinkToRelationshipInput]
) {    
    updateZaneBlog(
        id: $id,
        data: {
            role: $role,
            title: $title,
            description: $description,
            content: $content,
            tags: $tags,
            createdDate: $createdDate,
            lastUpdatedDate: $lastUpdatedDate,
            featured: $featured,
            cover: $cover,
            hasLinkTo: $hasLinkTo,
        }
    ) { id }
}
"""

GQL_CreateBlog = """
mutation (
    $id: String!, 
    $role: ZaneBlog_role_MutationInput!, 
    $title: String!, 
    $description: String!, 
    $content: String!, 
    $tags: [String!]!, 
    $createdDate: String!, 
    $lastUpdatedDate: String!, 
    $featured: Boolean!, 
    $cover: String!,
    $hasLinkTo: [ZaneBlog_HasLinkToRelationshipInput]
) {
    createZaneBlog(
        data: {
            id: $id,
            role: $role,
            title: $title,
            description: $description,
            content: $content,
            tags: $tags,
            createdDate: $createdDate,
            lastUpdatedDate: $lastUpdatedDate,
            featured: $featured,
            cover: $cover,
            hasLinkTo: $hasLinkTo,
        }
    ) { id }
}
"""

GQL_updateNote = """
mutation (
    $id: String!, 
    $role: ZaneNoteUpdate_role_MutationInput!, 
    $title: String!, 
    $content: String!, 
    $tags: [String!]!, 
    $createdDate: String!, 
    $lastUpdatedDate: String!, 
    $hasLinkTo: [ZaneNoteUpdate_HasLinkToRelationshipInput]
) {    
    updateZaneNote(
        id: $id,
        data: {
            role: $role,
            title: $title,
            content: $content,
            tags: $tags,
            createdDate: $createdDate,
            lastUpdatedDate: $lastUpdatedDate,
            hasLinkTo: $hasLinkTo,
        }
    ) { id }
}
"""

GQL_CreateNote = """
mutation (
    $id: String!, 
    $role: ZaneNote_role_MutationInput!, 
    $title: String!, 
    $content: String!, 
    $tags: [String!]!, 
    $createdDate: String!, 
    $lastUpdatedDate: String!, 
    $hasLinkTo: [ZaneNote_HasLinkToRelationshipInput]
) {
    createZaneNote(
        data: {
            id: $id,
            role: $role,
            title: $title,
            content: $content,
            tags: $tags,
            createdDate: $createdDate,
            lastUpdatedDate: $lastUpdatedDate,
            hasLinkTo: $hasLinkTo,
        }
    ) { id }
}
"""

GQL_QUERY = {
    WritingType.Blog: {
        OperationType.Create: GQL_CreateBlog,
        OperationType.Update: GQL_updateBlog,
        OperationType.Delete: GQL_deleteByID.replace("{slug}", WritingType.Blog.value),
    },
    WritingType.Note: {
        OperationType.Create: GQL_CreateNote,
        OperationType.Update: GQL_updateNote,
        OperationType.Delete: GQL_deleteByID.replace("{slug}", WritingType.Note.value), 
    },
}

def parse_files_candidates() -> Generator[pathlib.Path]:
    parser = argparse.ArgumentParser(
        description="Publish a new version of the documentation to the CMS."
    )
    parser.add_argument(
        "paths",
        nargs='*',
        help="Either a single file or a directory containing files to publish.",
    )

    def find_file_recursively(path: pathlib.Path) -> Generator[pathlib.Path]:
        if path.is_file():
            yield path
        elif path.is_dir():
            for child in path.iterdir():
                yield from find_file_recursively(child)

    ns = parser.parse_args()
    for path in ns.paths:
        yield from find_file_recursively(pathlib.Path(path))


def identify_operation_type(path: pathlib.Path) -> tuple[OperationType, WritingType | None]:
    if path.suffix != ".md" or "drafts" in path.parts:
        return (OperationType.Noop, None)
    
    if "blog" == path.parts[0]:
        type = WritingType.Blog
    elif "note" == path.parts[0]:
        type = WritingType.Note
    else:
        return (OperationType.Noop, None)
    
    if not path.exists():
        return (OperationType.Delete, type)

    exist = gql_request(GQL_getByID.replace("{slug}", type.value), {"id": path.stem}).json()["data"][type.value] is not None
    if exist:
        return (OperationType.Update, type)
    else:
        return (OperationType.Create, type)


def parse_arguments(path: pathlib.Path) -> dict:
    doc_id = path.stem
    role = path.parts[2]
    markdown_content = path.read_text(encoding="utf-8")
    front_matter, markdown_content = markdown_content.split('---', 2)[1: ]
    metadata = yaml.safe_load(front_matter)

    if path.parts[0] == "blog":
        return {
            "id": doc_id, 
            "role": role, 
            "content": markdown_content.strip(),
            "title": metadata["title"],
            "description": metadata["description"],
            "tags": metadata.get("tags", []),
            "createdDate": metadata["created-date"].isoformat(),
            "lastUpdatedDate": metadata["last-updated-date"].isoformat(),
            "featured": metadata.get("featured", False), 
            "cover": resolve_cover_id(metadata["cover-url"]),
            "hasLinkTo": [],
        }
    elif path.parts[0] == "note":
        return {
            "id": doc_id, 
            "role": role, 
            "content": markdown_content.strip(),
            "title": metadata["title"],
            "tags": metadata.get("tags", []),
            "createdDate": metadata["created-date"].isoformat(),
            "lastUpdatedDate": metadata["last-updated-date"].isoformat(),
            "hasLinkTo": [],
        }


def resolve_cover_id(cover_url: str) -> int:
    response = gql_request("""
        query ($name: String!) {
            allMedia ( where: { filename: { equals: $name } } ) {
                docs { id }
            }
        }
        """, 
        {"name": cover_url.split("/")[-1].strip()}
    )

    return response.json()["data"]["allMedia"]["docs"][0]["id"]

def gql_request(query: str, args: dict) -> requests.Response:
    return requests.post(
        f"{cms_url}/api/graphql",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"users API-Key {cms_apikey}",
        },
        json={
            "query": query,
            "variables": args,
        }
    )


def main():
    files = list(parse_files_candidates())
    for file_path in files:
        operation, writing_type = identify_operation_type(file_path)
        if operation == OperationType.Noop or writing_type is None:
            logger.info(f"Skipping {file_path}")
            continue
    
        logger.info(f"{operation.name} {writing_type.name}: {file_path}")

        response = gql_request(
            GQL_QUERY[writing_type][operation],
            parse_arguments(file_path)
        )
        if response.status_code != 200 or "errors" in response.json():
            logger.error(f"Failed to {operation.name} {writing_type.name} {file_path}: {response.text}")


if __name__ == "__main__":
    main()