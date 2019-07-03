/*jshint strict: global */
/*jshint esversion: 6 */
/*jshint multistr: true */
/* globals require */
/* globals module */
/* globals console */

'use strict';

const   createRouter = require('@arangodb/foxx/router');
const   router = createRouter();
const   joi = require('joi');

const   g_db = require('@arangodb').db;
const   g_graph = require('@arangodb/general-graph')._graph('sdmsg');
const   g_lib = require('./support');

module.exports = router;


//==================== ACL API FUNCTIONS

router.get('/update', function (req, res) {
    try {
        var result = [];

        g_db._executeTransaction({
            collections: {
                read: ["u","p","uuid","accn","d","c","a","admin","alias"],
                write: ["c","d","acl"]
            },
            action: function() {
                const client = g_lib.getUserFromClientID( req.queryParams.client );
                var object = g_lib.getObject( req.queryParams.id, client );
                var owner_id = g_db.owner.firstExample({ _from: object._id })._to;
                //var owner = g_db._document( owner_id );
                //owner_id = owner_id.substr(2);

                //console.log("obj:",object);

                var is_coll;

                if ( object._id[0] == "c" )
                    is_coll = true;
                else
                    is_coll = false;

                if ( !is_coll && object._id[0] != "d" )
                    throw [g_lib.ERR_INVALID_PARAM,"Invalid object type, "+object._id];

                if ( !g_lib.hasAdminPermObject( client, object._id )){
                    if ( !g_lib.hasPermissions( client, object, g_lib.PERM_SHARE ))
                        throw g_lib.ERR_PERM_DENIED;
                }

                var acl_mode = 0;
                var new_obj = {};

                if ( req.queryParams.rules ){

                    // Delete existing ACL rules for this object
                    g_db.acl.removeByExample({ _from: object._id });

                    var rule;
                    var obj;

                    for ( var i in req.queryParams.rules ) {
                        rule = req.queryParams.rules[i];

                        if ( !is_coll && rule.inhgrant )
                            throw [g_lib.ERR_INVALID_PARAM,"Inherited permissions cannot be applied to data records"];

                        if ( rule.id == "default" || rule.id == "def" ) {
                            new_obj.grant = rule.grant;

                            if ( new_obj.grant == 0 )
                                new_obj.grant = null;

                            new_obj.inhgrant = rule.inhgrant;

                            if ( new_obj.inhgrant == 0 )
                                new_obj.inhgrant = null;

                        } else {
                            if ( rule.id.startsWith("g/")){
                                acl_mode |= 2;
                                var group = g_db.g.firstExample({ uid: owner_id, gid: rule.id.substr(2) });

                                if ( !group )
                                    throw [g_lib.ERR_NOT_FOUND,"Group "+rule.id+" not found"];

                                rule.id = group._id;

                            } else {
                                acl_mode |= 1;
                                if ( !g_db._exists( rule.id ))
                                    throw [g_lib.ERR_NOT_FOUND,"User "+rule.id+" not found"];
                            }

                            obj = { _from : object._id, _to:rule.id };
                            if ( rule.grant )
                                obj.grant = rule.grant;
                            if ( rule.inhgrant )
                                obj.inhgrant = rule.inhgrant;

                            g_db.acl.save( obj );
                        }
                    }
                }

                new_obj.acls = acl_mode;

                if ( req.queryParams.public != undefined ){
                    if ( req.queryParams.public )
                        new_obj.public = true;
                    else
                        new_obj.public = null;
                }

                g_db._update( object._id, new_obj, { keepNull: false } );

                result = g_db._query( "for v, e in 1..1 outbound @object acl return { id: v._id, gid: v.gid, grant: e.grant, inhgrant: e.inhgrant }", { object: object._id }).toArray();
                postProcACLRules( result, object );
            }
        });

        res.send( result );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('id', joi.string().required(), "ID or alias of data record or collection")
.queryParam('rules', joi.array().items(g_lib.acl_schema).optional(), "User and/or group ACL rules to create")
.queryParam('public', joi.boolean().optional(), "Enable public access")
.summary('Update ACL(s) and/or public access on a data record or collection')
.description('Update access control list(s) (ACLs) and/or public access on a data record or collection. Default access permissions are set using ACLs with id of "default". Inherited permissions can only be set on collections.');

router.get('/view', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );
        var object = g_lib.getObject( req.queryParams.id, client );

        if ( object._id[0] != "c" && object._id[0] != "d" )
            throw [g_lib.ERR_INVALID_PARAM,"Invalid object type, "+object._id];

        if ( !g_lib.hasAdminPermObject( client, object._id )) {
            if ( !g_lib.hasPermissions( client, object, g_lib.PERM_SHARE ))
                throw g_lib.ERR_PERM_DENIED;
        }

        var rules = g_db._query( "for v, e in 1..1 outbound @object acl return { id: v._id, gid: v.gid, grant: e.grant, inhgrant: e.inhgrant }", { object: object._id }).toArray();
        postProcACLRules( rules, object );

        res.send( rules );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('id', joi.string().required(), "ID or alias of data record or collection")
.summary('View current ACL on an object')
.description('View current ACL on an object (data record or collection)');


router.get('/by_user', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );

        res.send( g_lib.usersWithClientACLs( client._id ));
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.summary('List users that have shared data or collections with client')
.description('List users that have shared data or collections with client');


router.get('/by_user/list2', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );
        const owner_id = req.queryParams.owner;

        var result = g_db._query("for v in 1..2 inbound @client member, acl filter v.owner == @owner return {id:v._id,title:v.title,alias:v.alias,locked:v.locked}", { client: client._id, owner: owner_id });
 
        res.send( result );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('owner', joi.string().required(), "Owner ID")
.summary('Lists data and collections shared with client by owner')
.description('Lists data and collections shared with client by owner');

function dedupShares( client, shares ){
    var i,j,k,id;
    var items = {},item,parent;

    for ( i in shares ){
        id = shares[i].id;
        item = {paths:[],data:shares[i]};
        parent = g_db.item.byExample({_to:item.data.id}).toArray();
        if ( parent.length ){
            for ( j in parent ){
                item.paths.push({path:[id,parent[j]._from],par:null,done:false});
            }
        }else{
            item.paths.push({path:[id],par:null,done:true});
        }
        items[id] = item;
    }

    // Calculate parent paths up to ancestors with shares
    var work = true,first = true,path;
    while( work ){
        work = false;
        for( i in items ){
            if (items.hasOwnProperty(i)) {
                item = items[i];
                for ( j in item.paths ){
                    path = item.paths[j];
                    if ( !path.done ){
                        id = path.path[path.path.length-1];

                        if ( first ){
                            if ( id in items ){
                                path.par = id;
                                path.done = true;
                                continue;
                            }
                        }

                        parent = g_db.item.firstExample({_to:id});
                        if ( parent ){
                            path.path.push(parent._from);
                            if ( parent._from in items ){
                                path.par = parent._from;
                                path.done = true;
                            }else{
                                work = true;
                            }
                        }else{
                            path.done = true;
                        }
                    }
                }
            }
        }
        first = false;
    }

    // Remove any independent shares (no ancestor/descendant)
    shares=[];
    for( i in items ){
        if (items.hasOwnProperty(i)) {
            item = items[i];
            parent = false;
            for ( j in item.paths ){
                path = item.paths[j];
                if ( path.par ){
                    parent = true;
                }
            }
            if ( !parent ){
                shares.push(item.data);
                delete items[i];
            }
        }
    }

    // Determine if descendants are navigable from ancestors
    var perm,coll;
    for( i in items ){
        if (items.hasOwnProperty(i)) {
            item = items[i];
            work = false;

            for ( j in item.paths ){
                path = item.paths[j];

                for ( k = path.path.length-1; k > 0; k-- ){
                    coll = g_db.c.document( path.path[k] );
                    perm = g_lib.getPermissionsLocal( client, coll );
                    if ( perm.inhgrant & g_lib.PERM_LIST ){
                        k = 0;
                        break;
                    }
                    if (( perm.grant & g_lib.PERM_LIST ) == 0 )
                        break;
                }

                if ( k == 0 ){
                    work = true;
                    break;
                }
            }

            if ( !work ){
                shares.push(item.data);
            }
        }
    }

    shares.sort( function( a, b ){
        if ( a.id.charAt(0) != b.id.charAt(0) ){
            if ( a.id.charAt(0) == 'c' )
                return -1;
            else
                return 1;
        } else
            return a.title.localeCompare( b.title );
    });

    return shares;
}

router.get('/by_user/list', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );
        const owner_id = req.queryParams.owner;

        var shares = g_db._query("for v in 1..2 inbound @client member, acl filter v.owner == @owner return {id:v._id,title:v.title,alias:v.alias,locked:v.locked}", { client: client._id, owner: owner_id }).toArray();

        if ( shares.length < 2 ){
            res.send(shares);
        }else{
            res.send(dedupShares( client, shares ));
        }
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('owner', joi.string().required(), "Owner ID")
.summary('Lists data and collections shared with client by owner')
.description('Lists data and collections shared with client by owner');

router.get('/by_proj', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );
        var result = g_lib.projectsWithClientACLs( client._id );
        res.send( result );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.summary('List users that have shared data or collections with client')
.description('List users that have shared data or collections with client');

router.get('/by_proj/list', function (req, res) {
    try {
        const client = g_lib.getUserFromClientID( req.queryParams.client );
        const owner_id = req.queryParams.owner;
        var shares = g_db._query("for v in 1..2 inbound @client member, acl filter v.owner == @owner return {id:v._id,title:v.title,alias:v.alias,locked:v.locked}", { client: client._id, owner: owner_id }).toArray();

        if ( shares.length < 2 ){
            res.send(shares);
        }else{
            res.send(dedupShares( client, shares ));
        }
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('owner', joi.string().required(), "Owner ID")
.summary('Lists data and collections shared with client by owner')
.description('Lists data and collections shared with client by owner');

function postProcACLRules( rules, object ) {
    var rule;

    for ( var i in rules ) {
        rule = rules[i];

        if ( rule.gid != null ) {
            rule.id = "g/"+rule.gid;
        } else
            delete rule.gid;

        if ( rule.grant == null )
            delete rule.grant;

        if ( rule.inhgrant == null )
            delete rule.inhgrant;
    }

    if ( object.grant || object.inhgrant ) {
        rule = { id: 'default' };
        if ( object.grant != null )
            rule.grant = object.grant;
        if ( object.inhgrant != null )
            rule.inhgrant = object.inhgrant;
        
        rules.push( rule );
    }
}