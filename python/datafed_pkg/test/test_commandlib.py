import pytest

"""
loginByPassword(uid, password)
incorrect data types
invalid credentials when user already / not logged in
valid credentials when user already / not logged in

logout()

generateCredentials()


dataView(self, data_id, details=False, context=None)
incorrect data types for each input
collection ID or project ID instead of data ID
SETUP uses - data create
VALIDATION uses DataView - title, alias, description, extension, metadata, parent_id, dependency, repository_id
correct unique ID in user's space
correct unique ID in project / other user's space
correct alias in user's space. No context set
correct alias in project space. No context set
correct alias in project space with context set
correct alias in another user's context


dataCreate(title, alias=None, description=None, tags=None, extension=None, 
           metadata=None, metadata_file=None, parent_id='root', deps=None, 
           repo_id=None, context=None)
incorrect data types for title, alias, description, tags, extension, .....
VALIDATION uses collectionItemsList() to verify that no more or fewer records were created
VALIDATION uses dataView() - use title, alias, description, extension, metadata, parent_id, dependency, repository_id
minimal - just title -> creates in user's space
title + description + tags
flat metadata as JSON string
nested metadata as JSON string
flat metadata as JSON file
nested metadata as JSON file
specify parent_id as "root" no context specified - should be created in default context
specify parent_id as some other collection (write access present)
specify parent_id as a collection without write privileges
set context to a project - parent_id is not set.
set context to a user's collection (shared). parent_id is not set
set context to project and parent_id is a collection in project
specify single dependency
specify multiple dependencies - one of each type
specify dependency as a collection - should throw error


dataUpdate(data_id, title=None, alias=None, description=None, tags=None, 
            extension=None, metadata=None, metadata_file=None, 
            metadata_set=False, deps_add=None, deps_rem=None, context=None)
just specify data_id should result in an error
incorrect data types for each input
collection ID or project ID instead of data ID
correct unique ID in user's space
correct unique ID in project / other user's space
correct alias in user's space. No context set
correct alias in project space. No context set
correct alias in project space with context set
correct alias in another user's context
attempt to update with no write access to record
set only title
set only alias
reset alias
set / reset description
set / reset tags only
add to existing metadata
add to existing nested metadata - inner portion
add with JSON file instead
replace all metadata - flat
replace all metadata nested
replace with JSON file instead
add single dependency w/ dependency already present
add multiple dependencies - one of each type
remove single dependency
remove multiple dependencies


dataDelete(data_id, context=None)
invalid data types for data_id


































"""