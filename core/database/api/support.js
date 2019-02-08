/*jshint strict: global */
/*jshint esversion: 6 */
/*jshint multistr: true */
/* globals require */
/* globals module */
/* globals console */

'use strict';

const   joi = require('joi');


module.exports = ( function() {
    var obj = {};

    obj.db = require('@arangodb').db;
    obj.graph = require('@arangodb/general-graph')._graph('sdmsg');

    obj.PERM_RD_REC         = 0x0001; // Read record info (description, keywords, details)
    obj.PERM_RD_META        = 0x0002; // Read structured metadata
    obj.PERM_RD_DATA        = 0x0004; // Read raw data
    obj.PERM_WR_REC         = 0x0008; // Write record info (description, keywords, details)
    obj.PERM_WR_META        = 0x0010; // Write structured metadata
    obj.PERM_WR_DATA        = 0x0020; // Write raw data
    obj.PERM_LIST           = 0x0040; // Find record and view ID, alias, title, and owner
    obj.PERM_LINK           = 0x0080; // Link/unlink child records (collections only)
    obj.PERM_CREATE         = 0x0100; // Create new child records (collections only)
    obj.PERM_DELETE         = 0x0200; // Delete record
    obj.PERM_SHARE          = 0x0400; // View/set ACLs
    obj.PERM_LOCK           = 0x0800; // Lock record
    obj.PERM_LABEL          = 0x1000; // Label record
    obj.PERM_TAG            = 0x2000; // Tag record
    obj.PERM_ANNOTATE       = 0x4000; // Annotate record

    obj.PERM_NONE           = 0x0000;
    obj.PERM_ALL            = 0x7FFF;
    obj.PERM_MEMBER         = 0x0007; // Project record perms
    obj.PERM_MANAGER        = 0x0407; // Project record perms
    obj.PERM_PUBLIC         = 0x000F;


    obj.XS_INIT             = 0;
    obj.XS_ACTIVE           = 1;
    obj.XS_INACTIVE         = 2;
    obj.XS_SUCCEEDED        = 3;
    obj.XS_FAILED           = 4;

    obj.XM_GET              = 0;
    obj.XM_PUT              = 1;
    obj.XM_COPY             = 2;

    obj.PROJ_NO_ROLE        = 0;    // No permissions
    obj.PROJ_MEMBER         = 1;    // Data/collection Permissions derived from "members" group and other ACLs
    obj.PROJ_MANAGER        = 2;    // Adds permission to manage groups and grants ADMIN permission on all data/collections
    obj.PROJ_ADMIN          = 3;    // Grants all permissions (edit and delete project)

    obj.SS_MY_DATA          = 0x01;
    obj.SS_MY_PROJ          = 0x02;
    obj.SS_TEAM_PROJ        = 0x04;
    obj.SS_USER_SHARE       = 0x08;
    obj.SS_PROJ_SHARE       = 0x10;
    obj.SS_PUBLIC           = 0x20;

    obj.acl_schema = joi.object().keys({
        id: joi.string().required(),
        grant: joi.number().optional(),
        inhgrant: joi.number().optional()
    });

    obj.ERR_INFO = [];
    obj.ERR_COUNT = 0;

    obj.ERR_AUTHN_FAILED          = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Authentication Failed" ]);
    obj.ERR_PERM_DENIED           = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Permission Denied" ]);
    obj.ERR_INVALID_PARAM         = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Invalid Parameter" ]);
    obj.ERR_INPUT_TOO_LONG        = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Input value too long" ]);
    obj.ERR_INVALID_CHAR          = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Invalid character" ]);
    obj.ERR_NOT_FOUND             = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Record Not Found" ]);
    obj.ERR_IN_USE                = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Value In Use" ]);
    obj.ERR_LINK                  = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Collection Link Error" ]);
    obj.ERR_UNLINK                = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Collection Unlink Error" ]);
    obj.ERR_MISSING_REQ_PARAM     = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Missing one or more required parameters" ]);
    obj.ERR_NO_RAW_DATA           = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Record has no raw data" ]);
    obj.ERR_XFR_CONFLICT          = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Data transfer conflict" ]);
    obj.ERR_INTERNAL_FAULT        = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Internal server fault" ]);
    obj.ERR_NO_ALLOCATION         = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "No storage allocation available" ]);
    obj.ERR_ALLOCATION_EXCEEDED   = obj.ERR_COUNT++; obj.ERR_INFO.push([ 400, "Storage allocation exceeded" ]);


    obj.CHARSET_ID      = 0;
    obj.CHARSET_ALIAS   = 1;
    obj.CHARSET_TOPIC   = 2;

    obj.extra_chars = ["_-.","_-.","_-."];

    obj.field_reqs = {
        title: { required: true, update: true, max_len: 80, label: 'title' },
        alias: { required: false, update: true, max_len: 60, lower: true, charset: obj.CHARSET_ALIAS, label: 'alias' },
        desc: { required: false, update: true, max_len: 500, label: 'description' },
        summary: { required: false, update: true, max_len: 500, in_field: "desc", out_field: "desc", label: 'description' },
        keyw: { required: false, update: true, max_len: 200, lower: true, label: 'keywords' },
        topic: { required: false, update: true, max_len: 30, lower: true, charset: obj.CHARSET_TOPIC, label: 'topic' },
        gid: { required: true, update: false, max_len: 40, lower: true, charset: obj.CHARSET_ID, label: 'group ID' },
        id: { required: true, update: false, max_len: 40, lower: true, charset: obj.CHARSET_ID, out_field: "_key", label: 'ID' }
    };

    obj.procInputParam = function( a_in, a_field, a_update, a_out ){
        var val, spec = obj.field_reqs[a_field];

        //console.log("procInput",a_field,",update:",a_update);

        if ( !spec ){
            throw [obj.ERR_INTERNAL_FAULT,"Input specification for '" + a_field + "' not found. Please context system administrator."];
        }

        if ( spec.in_field )
            val = a_in[spec.in_field];
        else
            val = a_in[a_field];

        //console.log("init val",val);

        // Ignore param updates when not allowed to be updated
        if ( a_update && !spec.update ){
            //console.log("stop b/c no update allowed");
            return;
        }

        if ( val && val.length )
            val = val.trim();

        if ( val && val.length ){
            // Check length if specified
            if ( spec.max_len && ( val.length > spec.max_len ))
                throw [obj.ERR_INPUT_TOO_LONG,"'" + spec.label + "' field is too long. Maximum length is " + spec.max_len + "." ];

            if ( spec.lower )
                val = val.toLowerCase();

            if ( spec.charset != undefined ){
                var extra = obj.extra_chars[spec.charset];
                var code, i, len;

                for (i = 0, len = val.length; i < len; i++) {
                    code = val.charCodeAt(i);
                    if (!(code > 47 && code < 58) && // numeric (0-9)
                        !(code > 64 && code < 91) && // upper alpha (A-Z)
                        !(code > 96 && code < 123)) { // lower alpha (a-z)
                        if ( extra.indexOf( val.charAt( i )) == -1 )
                            throw [obj.ERR_INVALID_CHAR,"Invalid character(s) in '" + spec.label + "' field."];
                    }
                }
            }
            //console.log("save new val:",val);

            if ( spec.out_field )
                a_out[spec.out_field] = val;
            else
                a_out[a_field] = val;
        }else{
            // Required params must have a value
            if ( a_update ){
                if ( val === "" ){
                    if ( spec.required )
                        throw [obj.ERR_MISSING_REQ_PARAM,"Required field '" + spec.label + "' cannot be deleted."];

                    if ( spec.out_field )
                        a_out[spec.out_field] = null;
                    else
                        a_out[a_field] = null;
                }
            }else if ( spec.required )
                throw [obj.ERR_MISSING_REQ_PARAM,"Missing required field '" + spec.label + "'."];
            }
    };

    obj.isInteger = function( x ) {
        return (typeof x === 'number') && (x % 1 === 0);
    };

    /*
    obj.isAlphaNumeric = function(str) {
        var code, i, len;

        for (i = 0, len = str.length; i < len; i++) {
            code = str.charCodeAt(i);
            if (!(code > 47 && code < 58) && // numeric (0-9)
                !(code > 64 && code < 91) && // upper alpha (A-Z)
                !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
            }
        }
        return true;
    };*/

    obj.handleException = function( e, res ) {
        console.log( "Service exception:", e );

        if ( obj.isInteger( e ) && e >= 0 && e < obj.ERR_COUNT ) {
            res.throw( obj.ERR_INFO[e][0], obj.ERR_INFO[e][1] );
        } else if ( Array.isArray( e )) {
            res.throw( obj.ERR_INFO[e[0]][0], e[1] );
        } else if ( e.hasOwnProperty( "errorNum" )) {
            switch ( e.errorNum ) {
                case 1202:
                    res.throw( 404, "Record does not exist" );
                    break;
                case 1210:
                    res.throw( 409, "Conflicting ID or alias" );
                    break;
                default:
                    res.throw( 500, "Unexpected DB exception: " + e );
                    break;
            }
        } else {
            res.throw( 500, "Unexpected exception: " + e );
        }
    };

    obj.isDomainAccount = function( a_client_id ) {
        if ( a_client_id.indexOf( "." ) != -1 )
            return true;
        else
            return false;
    };

    obj.isUUID = function( a_client_id ) {
        if ( a_client_id.length == 36 && a_client_id.charAt(8) == "-" )
            return true;
        else
            return false;
    };

    obj.getUserFromClientID = function( a_client_id ) {
        // Client ID can be an SDMS uname (xxxxx...), a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), or an account (domain.uname)
        // UUID are defined by length and format, accounts have a "." (and known domains), SDMS unames have no "." or "-" characters

        var params;

        if ( a_client_id.startsWith("u/")){
            return obj.db._document({ _id: a_client_id });
        } else if ( obj.isDomainAccount( a_client_id )) {
            // Account
            params = { 'id': 'accn/' + a_client_id };
        } else if ( obj.isUUID( a_client_id  )) {
            // UUID
            params = { 'id': 'uuid/' + a_client_id };
        } else {
            return obj.db._document({ _id: "u/" + a_client_id });
        }

        var result = obj.db._query( "for j in inbound @id ident return j", params, { cache: true } ).toArray();

        if ( result.length != 1 ){
            console.log("Client", a_client_id, "not found, params:", params );
            throw [obj.ERR_NOT_FOUND,"Client, "+a_client_id+", not found"];
        }

        return result[0];
    };

    obj.findUserFromUUIDs = function( a_uuids ) {
        var result = obj.db._query( "for i in ident filter i._to in @ids return distinct document(i._from)", { ids: a_uuids }).toArray();

        if ( result.length != 1 )
            throw [obj.ERR_NOT_FOUND,"No user matching Globus IDs found"];

        return result[0];
    };

    obj.uidFromPubKey = function( a_pub_key ) {
        //var result = obj.db._query( "for i in accn filter i.pub_key == @key let u = (for v in inbound i._id ident return v._key) return u[0]", { key: a_pub_key }).toArray();
        var result = obj.db._query( "for i in u filter i.pub_key == @key return i._id", { key: a_pub_key }).toArray();

        if ( result.length != 1 )
            throw [obj.ERR_NOT_FOUND,"No user matching authentication key found"];

        return result[0];
    };

    obj.findUserFromPubKey = function( a_pub_key ) {
        var result = obj.db._query( "for i in accn filter i.pub_key == @key let u = (for v in inbound i._id ident return v) return u[0]", { key: a_pub_key }).toArray();

        console.log( "key res:", result );
        if ( result.length != 1 )
            throw [obj.ERR_NOT_FOUND,"No user matching authentication key found"];

        return result[0];
    };

    obj.getProjectRole = function( a_client_id, a_proj_id ){
        if ( obj.db.owner.firstExample({ _from: a_proj_id, _to: a_client_id }))
            return obj.PROJ_ADMIN;

        if ( obj.db.admin.firstExample({ _from: a_proj_id, _to: a_client_id }))
            return obj.PROJ_MANAGER;

        var res = obj.db._query( "for v,e,p in 3..3 inbound @user member, acl, outbound owner filter p.vertices[1].gid == 'members' and v._id == @proj return { id: v._id }", { user: a_client_id, proj: a_proj_id }).toArray();

        if ( res.length == 1 )
            return obj.PROJ_MEMBER;
        else
            return obj.PROJ_NO_ROLE;
    };

    obj.assignRepo = function( a_user_id ){
        //var repos = obj.db._query( "for v, e in 1..1 outbound @user alloc return { repo: v, alloc: e }", { user: a_user_id }).toArray();
        var repos = obj.db.alloc.byExample({ _from: a_user_id }).toArray();

        for ( var i in repos ){
            if ( repos[i].usage < repos[i].alloc )
                return repos[i];
        }

        return null;
    };

    obj.verifyRepo = function( a_user_id, a_repo_id ){
        var alloc = obj.db.alloc.firstExample({ _from: a_user_id, _to: a_repo_id });
        if ( !alloc )
            throw obj.ERR_NO_ALLOCATION;
        if ( alloc.usage >= alloc.alloc )
            throw obj.ERR_ALLOCATION_EXCEEDED;
        return alloc;
    };

    obj.getRootID = function( owner_id ){
        return "c/"+owner_id[0]+"_"+owner_id.substr(2)+"_root";
    };

    obj.getObject = function( a_obj_id, a_client ) {
        var id = obj.resolveID( a_obj_id, a_client );

        try {
            return obj.db._document( id );
        } catch( e ) {
            throw [obj.ERR_NOT_FOUND,"Object, "+a_obj_id+", not found"];
        }
    };

    obj.deleteData = function( a_data, a_allocs, a_locations ){
        // Delete attached alias
        var alias = obj.db._query( "for v in 1..1 outbound @id alias return v._id", { id: a_data._id });
        if ( alias.hasNext() ) {
            obj.graph.a.remove( alias.next() );
        }

        var top = obj.db.top.firstExample({_from: a_data._id});
        if ( top )
            obj.topicUnlink( a_data._id );

        var loc = obj.db.loc.firstExample({_from: a_data._id });
        a_locations.push({ id: a_data._id, repo_id: loc._to, path: loc.path });

        // Adjust allocation for data size
        if ( a_data.size ){
            if ( loc.parent ){
                loc._to = loc.parent;
            }

            if ( a_allocs[loc._to] )
                a_allocs[loc._to] += a_data.size;
            else
                a_allocs[loc._to] = a_data.size;
        }

        obj.graph.d.remove( a_data._id );
    };

    obj.deleteCollection = function( a_coll_id, a_allocs, a_locations ){
        // Delete collection aliases, if present
        var alias = obj.db._query( "for v in 1..1 outbound @coll alias return v._id", { coll: a_coll_id });
        if ( alias.hasNext() ) {
            obj.graph.a.remove( alias.next() );
        }

        // Recursively collect all linked items (data and collections) for deletion or unlinking
        // Since this could be a very large and/or deep collection hierarchy, we will use a breadth-first traversal
        // to delete the collection layer-by-layer, rather than all-at-once. While deleting, any data records that are
        // actually deleted will have their data locations placed in an array that will be returned to the client. This
        // allows the client to coordinate deletion of raw data from associated data repos.

        // Note: data may be linked into the collection hierarchy being deleted more than once. This will cause the
        // delete logic to initially pass-over this data (in OWNED mode), but it will be deleted when the logic arrives
        // at the final instance of this data (thie link count will be 1 then).

        var item,items,coll,c,cur,next = [a_coll_id];

        while ( next.length ){
            cur = next;
            next = [];
            for ( c in cur ){
                coll = cur[c];
                //items = obj.db._query( "for v in 1..1 outbound @coll item let links = length(for v1 in 1..1 inbound v._id item return v1._id) return {_id:v._id,size:v.size,links:links}", { coll: coll });
                items = obj.db._query( "for v in 1..1 outbound @coll item return {_id:v._id,size:v.size}", { coll: coll });

                while ( items.hasNext() ) {
                    item = items.next();
                    if ( item._id[0] == "d" ){
                        obj.deleteData( item, a_allocs, a_locations );
                        /*if ( item.links == 1 ){
                            // Save location and delete
                            obj.deleteData( item, a_allocs, a_locations );
                        }else{
                            // Unlink from current collection
                            obj.db.item.removeByExample({_from:coll,_to:item._id});
                        }*/
                    }else{
                        next.push(item._id);
                    }
                }

                alias = obj.db._query( "for v in 1..1 outbound @id alias return v._id", { id: coll });
                if ( alias.hasNext() ) {
                    obj.graph.a.remove( alias );
                }

                obj.graph.c.remove( coll );
            }
        }
    };

    obj.updateAllocations = function( a_allocs, a_owner_id ){
        console.log("updateAllocations",a_allocs,a_owner_id);

        var alloc;
        for ( var id in a_allocs ){
            if ( id.startsWith( "alloc" )){
                alloc = obj.db.alloc.document({ _id: id });
                console.log("sub alloc:",alloc);

                var proj = obj.db.p.document( a_owner_id );
                obj.db._update( proj._id, { sub_usage: proj.sub_usage - a_allocs[id] });
            }else{
                alloc = obj.db.alloc.firstExample({_from: a_owner_id, _to: id });
                console.log("normal alloc:",alloc);
            }

            obj.db._update( alloc._id, { usage: alloc.usage - a_allocs[id] });
        }
    };

    obj.hasAdminPermUser = function( a_client, a_user_id ) {
        //if ( a_client._id != a_user_id && !a_client.is_admin && !obj.db.owner.firstExample({ _from: a_user_id, _to: a_client._id }) && !obj.db.admin.firstExample({ _from: a_user_id, _to: a_client._id })){ 
        if ( a_client._id != a_user_id && !a_client.is_admin ){ 
            return false;
        } else {
            return true;
        }
    };

    obj.hasAdminPermProj = function( a_client, a_proj_id ) {
        if ( !a_client.is_admin && !obj.db.owner.firstExample({ _from: a_proj_id, _to: a_client._id }))  { 
            return false;
        } else {
            return true;
        }
    };

    obj.hasManagerPermProj = function( a_client, a_proj_id ) {
        if ( !a_client.is_admin && !obj.db.owner.firstExample({ _from: a_proj_id, _to: a_client._id }) && !obj.db.admin.firstExample({ _from: a_proj_id, _to: a_client._id }))  { 
            return false;
        } else {
            return true;
        }
    };

    obj.hasAdminPermObject = function( a_client, a_object_id ) {
        if ( a_client.is_admin )
            return true;

        var owner_id = obj.db.owner.firstExample({ _from: a_object_id })._to;
        if ( owner_id == a_client._id )
            return true;

        if ( owner_id[0] == "p" ){
            // Object owned by a project
            if ( obj.db.admin.firstExample({ _from: owner_id, _to: a_client._id }))
                return true;

            if ( obj.db.owner.firstExample({ _from: owner_id, _to: a_client._id }))
                return true;
        }

        return false;
    };

    obj.hasAdminPermRepo = function( a_client, a_repo_id ) {
        if ( !a_client.is_admin && !obj.db.admin.firstExample({ _from: a_repo_id, _to: a_client._id }))  { 
            return false;
        } else {
            return true;
        }
    };

    obj.ensureAdminPermUser = function( a_client, a_user_id ) {
        if ( !obj.hasAdminPermUser( a_client, a_user_id ))
            throw obj.ERR_PERM_DENIED;
    };

    obj.ensureAdminPermProj = function( a_client, a_user_id ) {
        if ( !obj.hasAdminPermProj( a_client, a_user_id ))
            throw obj.ERR_PERM_DENIED;
    };

    obj.ensureManagerPermProj = function( a_client, a_user_id ) {
        if ( !obj.hasManagerPermProj( a_client, a_user_id ))
            throw obj.ERR_PERM_DENIED;
    };

    obj.ensureAdminPermObject = function( a_client, a_object_id ) {
        if ( !obj.hasAdminPermObject( a_client, a_object_id ))
            throw obj.ERR_PERM_DENIED;
    };

    obj.ensureAdminPermRepo = function( a_client, a_repo_id ) {
        if ( !obj.hasAdminPermRepo( a_client, a_repo_id ))
            throw obj.ERR_PERM_DENIED;
    };

    obj.isSrcParentOfDest = function( a_src_id, a_dest_id ){
        var parent;
        var child_id = a_dest_id;
        while ( 1 ){
            parent = obj.db.item.firstExample({_to: child_id});
            if ( !parent )
                return false;
            if ( parent._from == a_src_id )
                return true;
            child_id = parent._from;
        }
    };

    obj.resolveID = function( a_id, a_client ) {
        if ( a_id[1] == '/' ) {
            return a_id;
        } else {
            var alias_id = "a/";
            if ( a_id.indexOf(":") == -1 )
                alias_id += "u:"+a_client._key + ":" + a_id;
            else
                alias_id += a_id;

            var alias = obj.db.alias.firstExample({ _to: alias_id });
            if ( !alias )
                throw [obj.ERR_NOT_FOUND,"Alias, "+a_id+", not found"];

            return alias._from;
        }
    };


    obj.topicLink = function( a_topic, a_data_id ){
        //var top_ar = obj.parseTopic( a_topic );
        var top_ar = a_topic.split(".");
        var i,topic,parent = "t/root";

        for ( i = 0; i < top_ar.length; i++ ){
            topic = obj.db._query("for v in 1..1 inbound @par top filter v.title == @title filter is_same_collection('t',v) return v",{par:parent,title:top_ar[i]});
            if ( topic.hasNext() ){
                parent = topic.next()._id;
            }else{
                for ( ; i < top_ar.length; i++ ){
                    topic = obj.db.t.save({title:top_ar[i]},{returnNew:true});
                    obj.db.top.save({_from:topic._id,_to:parent});
                    parent = topic._id;
                }
                break;
            }
        }

        if ( !obj.db.top.firstExample({_from:a_data_id,_to:parent})){
            obj.db.top.save({_from:a_data_id,_to:parent});
        }
    };

    obj.topicUnlink = function( a_data_id ){
        var top = obj.db.top.firstExample({_from: a_data_id});
        if ( !top )
            return;

        var parent = top._to;
        obj.db.top.remove(top);

        // Unwind path, deleting orphaned topics along the way
        while ( parent != "t/root" ){
            if ( obj.db.top.firstExample({ _to: parent }))
                break;
            else {
                top = obj.db.top.firstExample({ _from: parent });
                parent = top._to;
                obj.graph.t.remove( top._from );
            }
        }
    };


    /* Test if client has requested permission(s) for specified object. Note: this call does NOT check for
     * ownership or admin privilege - the hasAdminPermObject function performs these checks and should be
     * called first if needed. This function is typically used when filtering a list of objects that are
     * known not to be owned by the client (and that the client is not an admin). In this case, those checks
     * would add performance cost for no benefit.
     */
    obj.hasPermissions = function( a_client, a_object, a_req_perm, any ) {
        //console.log("check perm:", a_req_perm, "client:", a_client._id, "object:", a_object._id, "any:", any );
        //console.log("grant:", a_object.grant );

        var perm_found=0,acl,acls,result,i;

        // If object is marked "public", everyone is granted VIEW, and READ permissions
        // The current implementation allows users to be denied access to public data (maybe wrong?)

        if ( a_object.public )
            perm_found = obj.PERM_PUBLIC;

        if ( a_object.grant )
            perm_found |= a_object.grant;

        result = obj.evalPermissions( a_req_perm, perm_found, any );
        if ( result != null )
            return result;

        // Evaluate user permissions set directly on object
        if ( a_object.acls & 1 ){
            acls = obj.db._query( "for v, e in 1..1 outbound @object acl filter v._id == @client return e", { object: a_object._id, client: a_client._id } ).toArray();

            if ( acls.length ){
                for ( i in acls ) {
                    acl = acls[i];
                    //console.log("user_perm:",acl);
                    perm_found |= acl.grant;
                }

                result = obj.evalPermissions( a_req_perm, perm_found, any );
                if ( result != null )
                    return result;
            }
        }

        // Evaluate group permissions on object
        if ( a_object.acls & 2 ){
            acls = obj.db._query( "for v, e, p in 2..2 outbound @object acl, outbound member filter p.vertices[2]._id == @client return p.edges[0]", { object: a_object._id, client: a_client._id } ).toArray();
            if ( acls.length ){
                for ( i in acls ) {
                    acl = acls[i];
                    //console.log("group_perm:",acl);
                    perm_found |= acl.grant;
                }

                result = obj.evalPermissions( a_req_perm, perm_found, any );
                if ( result != null )
                    return result;
            }
        }

        // If not all requested permissions have been found, evaluate permissions inherited from parent collections
        // Note that items can only be linked to containers that share the same owner
        // This evaluation is implemented as a manually guided breadth-first search

        var children = [a_object];
        var parents,parent;

        while ( 1 ) {
            // Find all parent collections owned by object owner

            parents = obj.db._query( "for i in @children for v in 1..1 inbound i item return {_id:v._id,inhgrant:v.inhgrant,public:v.public,acls:v.acls}", { children : children }).toArray();

            if ( parents.length == 0 )
                break;

            for ( i in parents ) {
                parent = parents[i];

                if ( parent.public )
                    perm_found |= obj.PERM_PUBLIC;

                if ( parent.inhgrant )
                    perm_found |= parent.inhgrant;

                result = obj.evalPermissions( a_req_perm, perm_found, any );
                if ( result != null )
                    return result;

                // User ACL first
                if ( parent.acls && (( parent.acls & 1 ) != 0 )){
                    acls = obj.db._query( "for v, e in 1..1 outbound @object acl filter v._id == @client return e", { object: parent._id, client: a_client._id } ).toArray();
                    if ( acls.length ){
                        for ( i in acls ) {
                            acl = acls[i];
                            perm_found |= acl.inhgrant;
                        }

                        result = obj.evalPermissions( a_req_perm, perm_found, any );
                        if ( result != null )
                            return result;
                    }
                }

                // Group ACL next
                if ( parent.acls && (( parent.acls & 2 ) != 0 )){
                    acls = obj.db._query( "for v, e, p in 2..2 outbound @object acl, outbound member filter is_same_collection('g',p.vertices[1]) and p.vertices[2]._id == @client return p.edges[0]", { object: parent._id, client: a_client._id } ).toArray();
                    if ( acls.length ){
                        for ( i in acls ) {
                            acl = acls[i];
                            perm_found |= acl.inhgrant;
                        }

                        result = obj.evalPermissions( a_req_perm, perm_found, any );
                        if ( result != null )
                            return result;
                    }
                }
            }

            // If there are still missing require permissions...
            // Determine which parents are candidates for further evaluation (have req bits not set in inherited permissions)
            children = parents;
        }

        //console.log("perm (last): false" );
        return false;
    };

    obj.evalPermissions = function( a_req_perm, a_perm_found, any ) {
        if ( any ){
            // If any requested permission have been found, return true (granted)
            if ( a_perm_found & a_req_perm )
                return true;
            else
                return null; // Else, keep looking
        } else {
            // If not all requested permissions have been found return NULL (keep looking)
            if (( a_perm_found & a_req_perm ) != a_req_perm )
                return null;
            else
                return true; // Else, permission granted
        }
    };

    obj.getPermissions = function( a_client, a_object, a_req_perm ) {
        //console.log("get perm:", a_req_perm, "client:", a_client._id, "object:", a_object._id, "any:", any );
        //console.log("grant:", a_object.grant );

        var perm_found=0,acl,acls,i;

        // If object is marked "public", everyone is granted VIEW, and READ permissions
        // The current implementation allows users to be denied access to public data (maybe wrong?)

        if ( a_object.public )
            perm_found = obj.PERM_PUBLIC;

        if ( a_object.grant )
            perm_found |= a_object.grant;

        if (( a_req_perm & perm_found ) == a_req_perm )
            return a_req_perm;

        // Evaluate permissions set directly on object

        if ( a_object.acls && ((a_object.acls & 1 ) != 0 )){
            acls = obj.db._query( "for v, e in 1..1 outbound @object acl filter v._id == @client return e", { object: a_object._id, client: a_client._id } ).toArray();

            if ( acls.length ){
                for ( i in acls ) {
                    acl = acls[i];
                    //console.log("user_perm:",acl);
                    perm_found |= acl.grant;
                }

                if (( a_req_perm & perm_found ) == a_req_perm )
                    return a_req_perm;
            }
        }

        // Evaluate group permissions on object

        if ( a_object.acls && ((a_object.acls & 2 ) != 0 )){
            acls = obj.db._query( "for v, e, p in 2..2 outbound @object acl, outbound member filter p.vertices[2]._id == @client return p.edges[0]", { object: a_object._id, client: a_client._id } ).toArray();

            if ( acls.length ){
                for ( i in acls ) {
                    acl = acls[i];
                    //console.log("group_perm:",acl);
                    perm_found |= acl.grant;
                }

                if (( a_req_perm & perm_found ) == a_req_perm )
                    return a_req_perm;
            }
        }

        // If not all requested permissions have been found, evaluate permissions inherited from parent collections
        // Note that items can only be linked to containers that share the same owner

        var children = [a_object];
        var parents,parent;

        while ( 1 ) {
            // Find all parent collections owned by object owner

            parents = obj.db._query( "for i in @children for v in 1..1 inbound i item return {_id:v._id,inhgrant:v.inhgrant,public:v.public,acls:v.acls}", { children : children }).toArray();

            if ( parents.length == 0 )
                break;

            for ( i in parents ) {
                parent = parents[i];

                if ( parent.public )
                    perm_found |= obj.PERM_PUBLIC;

                if ( parent.inhgrant )
                    perm_found |= parent.inhgrant;

                if (( a_req_perm & perm_found ) == a_req_perm )
                    return a_req_perm;

                // User ACL
                if ( parent.acls && (( parent.acls & 1 ) != 0 )){
                    acls = obj.db._query( "for v, e in 1..1 outbound @object acl filter v._id == @client return e", { object: parent._id, client: a_client._id } ).toArray();
                    if ( acls.length ){
                        for ( i in acls ) {
                            acl = acls[i];
                            perm_found |= acl.inhgrant;
                        }

                        if (( a_req_perm & perm_found ) == a_req_perm )
                            return a_req_perm;
                    }
                }

                // Group ACL
                if ( parent.acls && (( parent.acls & 2 ) != 0 )){
                    acls = obj.db._query( "for v, e, p in 2..2 outbound @object acl, outbound member filter is_same_collection('g',p.vertices[1]) and p.vertices[2]._id == @client return p.edges[0]", { object: parent._id, client: a_client._id } ).toArray();
                    if ( acls.length ){
                        for ( i in acls ) {
                            acl = acls[i];
                            perm_found |= acl.inhgrant;
                        }

                        if (( a_req_perm & perm_found ) == a_req_perm )
                            return a_req_perm;
                    }
                }
            }

            // If there are still missing require permissions...
            // Determine which parents are candidates for further evaluation (have req bits not set in inherited permissions)
            children = parents;
        }

        return perm_found & a_req_perm;
    };

    obj.getPermissionsLocal = function( a_client, a_object ) {
        var perm={grant:0,inhgrant:0},acl,acls,i;

        if ( a_object.grant )
            perm.grant |= a_object.grant;

        if ( a_object.inhgrant )
            perm.inhgrant |= a_object.inhgrant;

        if ( a_object.acls & 1 ){
            acls = obj.db._query( "for v, e in 1..1 outbound @object acl filter v._id == @client return e", { object: a_object._id, client: a_client._id } ).toArray();

            for ( i in acls ) {
                acl = acls[i];
                perm.grant |= acl.grant;
                perm.inhgrant |= acl.inhgrant;
            }
        }

        // Evaluate group permissions on object
        if ( a_object.acls & 2 ){
            acls = obj.db._query( "for v, e, p in 2..2 outbound @object acl, outbound member filter p.vertices[2]._id == @client return p.edges[0]", { object: a_object._id, client: a_client._id } ).toArray();
            for ( i in acls ) {
                acl = acls[i];
                perm.grant |= acl.grant;
                perm.inhgrant |= acl.inhgrant;
            }
        }

        return perm;
    };

    obj.usersWithClientACLs = function( client_id, id_only ){
        var result;
        if ( id_only ){
            result = obj.db._query("for x in union_distinct((for v in 2..2 inbound @user acl, outbound owner filter is_same_collection('u',v) return v._id),(for v,e,p in 3..3 inbound @user member, acl, outbound owner filter is_same_collection('g',p.vertices[1]) and is_same_collection('acl',p.edges[1]) and is_same_collection('u',v) return v._id)) return x", { user: client_id }).toArray();
        }else{
            result = obj.db._query("for x in union_distinct((for v in 2..2 inbound @user acl, outbound owner filter is_same_collection('u',v) return {uid:v._key,name:v.name}),(for v,e,p in 3..3 inbound @user member, acl, outbound owner filter is_same_collection('g',p.vertices[1]) and is_same_collection('acl',p.edges[1]) and is_same_collection('u',v) return {uid:v._key,name:v.name})) sort x.name return x", { user: client_id }).toArray();
        }
        //console.log("usersWithACLs:",result);
        return result;
    };

    obj.projectsWithClientACLs = function( client_id, id_only ){
        // Get projects that have ACLs set for client AND where client is not owner, admin, or member of project
        var result;
        if ( id_only ){
            result = obj.db._query("for i in minus((for v in 2..2 inbound @user member, acl, outbound owner filter is_same_collection('p',v) return v._id),(for v,e,p in 2..2 inbound @user member, outbound owner filter p.vertices[1].gid == 'members' and is_same_collection('p',v) return v._id)) return i",{user:client_id});
        }else{
            result = obj.db._query("for i in minus((for v in 2..2 inbound @user member, acl, outbound owner filter is_same_collection('p',v) return {id:v._id,title:v.title}),(for v,e,p in 2..2 inbound @user member, outbound owner filter p.vertices[1].gid == 'members' and is_same_collection('p',v) return {id:v._id,title:v.title})) return i",{user:client_id});
        }
        //console.log("projectsWithACLs:",result);
        return result;
    };


    return obj;
}() );

