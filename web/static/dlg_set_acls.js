function makeDlgSetACLs(){
    console.log("making dialog Set ACLs");

    var inst = this;

    //<div style='flex:none'><input type='checkbox' name='public_check' id='public_check'><label for='public_check'>Public data</label></div>


    this.content =
        "<div class='col-flex' style='height:100%;width:100%;min-height:0;overflow:none'>\
            <div style='flex:none'>ID/Alias: <span id='dlg_id'></span></div>\
            <div class='row-flex' style='flex:1 1 100%;width:100%;min-height:0'>\
                <div class='col-flex' style='flex:1 1 10%;min-width:0;min-height:0;'>\
                    <div style='flex:none;padding:.5rem 0 0 0'>Rules:</div>\
                    <div class='ui-widget-content text' style='flex:1 1 50%;min-height:0;min-width:0;width:100%;max-width:100%;overflow:auto'>\
                        <div id='dlg_rule_tree' class='no-border' style='min-height:0'></div>\
                    </div>\
                    <div style='flex:none;padding:2px 0 0 0;white-space:nowrap'>\
                        <button id='dlg_add_user' class='btn small'>Add User</button>\
                        <button id='dlg_add_group' class='btn small'>Add Group</button>\
                    </div><div style='flex:none;padding:2px 0 0 0'>\
                        <button id='dlg_edit' class='btn small'>Edit</button>\
                        <button id='dlg_rem' class='btn small'>Remove</button>\
                    </div>\
                </div>\
                <div style='flex:none'>&nbsp</div>\
                <div class='col-flex' style='flex:none'>\
                    <div style='flex:none;padding:.5rem 0 0 0'>Permissions:</div>\
                    <div class='ui-widget-content' style='flex:1 1 auto;overflow:auto;padding:.25em'>\
                        <div><label for='dlg_view_cb'></label><input type='checkbox' id='dlg_view_cb'>&nbsp View</div>\
                        <div id='dlg_create_row' style='display:none'><label for='dlg_create_cb'></label><input type='checkbox' id='dlg_create_cb'>&nbsp Create</div>\
                        <div><label for='dlg_upd_cb'></label><input type='checkbox' id='dlg_upd_cb'>&nbsp Update</div>\
                        <div><label for='dlg_read_cb'></label><input type='checkbox' id='dlg_read_cb'>&nbsp Read</div>\
                        <div><label for='dlg_write_cb'></label><input type='checkbox' id='dlg_write_cb'>&nbsp Write</div>\
                        <!-- div><label for='dlg_tag_cb'></label><input type='checkbox' id='dlg_tag_cb'>&nbsp Tag</div>\
                        <div><label for='dlg_note_cb'></label><input type='checkbox' id='dlg_note_cb'>&nbsp Annotate</div -->\
                        <div><label for='dlg_admin_cb'></label><input type='checkbox' id='dlg_admin_cb'>&nbsp Admin</div>\
                    </div>\
                    <div style='flex:none;white-space:nowrap;padding:2px 0 0 0'>\
                        <button title='Set permissions to \"read only\"' id='dlg_read_only' class='btn small'>RO</button>\
                        <button title='Set permissions to \"read/write\"'id='dlg_read_write' class='btn small'>R/W</button>\
                    </div><div style='flex:none;white-space:nowrap;padding:2px 0 0 0'>\
                        <button title='Set all permissions' id='dlg_grant_all' class='btn small'>All</button>\
                        <button title='Clear all permissions' id='dlg_inherit_all' class='btn small'>Clear</button>\
                    </div>\
                </div>\
                <div id='col_div_1' style='flex:none'>&nbsp</div>\
                <div id='col_div_2' class='col-flex' style='flex:none'>\
                    <div style='flex:none;padding:.5rem 0 0 0'>Inherited:</div>\
                    <div class='ui-widget-content' style='flex:1 1 auto;overflow:auto;padding:.25em'>\
                        <div><label for='dlg_inh_view_cb'></label><input type='checkbox' id='dlg_inh_view_cb'>&nbsp View</div>\
                        <div><label for='dlg_inh_create_cb'></label><input type='checkbox' id='dlg_inh_create_cb'>&nbsp Create</div>\
                        <div><label for='dlg_inh_upd_cb'></label><input type='checkbox' id='dlg_inh_upd_cb'>&nbsp Update</div>\
                        <div><label for='dlg_inh_read_cb'></label><input type='checkbox' id='dlg_inh_read_cb'>&nbsp Read</div>\
                        <div><label for='dlg_inh_write_cb'></label><input type='checkbox' id='dlg_inh_write_cb'>&nbsp Write</div>\
                        <!-- div><label for='dlg_inh_tag_cb'></label><input type='checkbox' id='dlg_inh_tag_cb'>&nbsp Tag</div>\
                        <div><label for='dlg_inh_note_cb'></label><input type='checkbox' id='dlg_inh_note_cb'>&nbsp Annotate</div -->\
                        <div><label for='dlg_inh_admin_cb'></label><input type='checkbox' id='dlg_inh_admin_cb'>&nbsp Admin</div>\
                    </div>\
                    <div  style='flex:none;white-space:nowrap;padding:2px 0 0 0'>\
                        <button title='Set inherited permissions to \"read-only\"' id='dlg_inh_read_only' class='btn small'>RO</button>\
                        <button title='Set inherited permissions to \"read/write\"' id='dlg_inh_read_write' class='btn small'>R/W</button>\
                    </div><div style='flex:none;white-space:nowrap;padding:2px 0 0 0'>\
                        <button title='Set all inherited permissions' id='dlg_inh_grant_all' class='btn small'>All</button>\
                        <button title='Clear all inherited permissions' id='dlg_inh_inherit_all' class='btn small'>Clear</button>\
                    </div>\
                </div>\
            </div>\
            <div style='flex:none;padding-top:.5em'><label for='public_check'></label><input type='checkbox' name='public_check' id='public_check'>&nbsp Enable public access</div>\
        </div>";

    this.show = function( item ){
        console.log( "show", item );
        inst.frame = $(document.createElement('div'));
        inst.frame.html( inst.content );
        inst.is_coll = (item.id[0]=="c");
        inst.uid = item.owner;
        inst.disable_state = null;

        if ( item.owner.startsWith("p/")){
            viewProj( inst.uid, function(proj){
                if (!proj){
                    alert("Unable to access project data");
                    dlg_inst.dialog('destroy').remove();
                    return;
                }
                inst.excl = [proj.owner,"g/members"];
                if ( proj.admin )
                    inst.excl = inst.excl.concat( proj.admin );
            });
        }else{
            inst.excl = [inst.uid];
        }

        if ( inst.is_coll ){
            $("#dlg_create_row",inst.frame).show();

            $("#dlg_inh_read_only",inst.frame).click( function(){ inst.setAllPermInh("readonly"); });
            $("#dlg_inh_read_write",inst.frame).click( function(){ inst.setAllPermInh("readwrite"); });
            $("#dlg_inh_grant_all",inst.frame).click( function(){ inst.setAllPermInh(true); });
            $("#dlg_inh_inherit_all",inst.frame).click( function(){ inst.setAllPermInh(false); });

            $("#dlg_inh_view_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_VIEW )});
            $("#dlg_inh_upd_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_UPDATE )});
            $("#dlg_inh_admin_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_ADMIN )});
            //$("#dlg_inh_tag_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_TAG )});
            //$("#dlg_inh_note_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_NOTE )});
            $("#dlg_inh_read_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_READ )});
            $("#dlg_inh_write_cb",inst.frame).on( "change",function(){ inst.selectInhHandler( $(this), PERM_WRITE )});

            $("#dlg_create_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_CREATE )});
            $("#dlg_inh_create_cb",inst.frame).on( "change", function(){ inst.selectInhHandler( $(this), PERM_CREATE )});
        }else{
            $("#col_div_1",inst.frame).hide();
            $("#col_div_2",inst.frame).hide();
        }


        $("#dlg_read_only",inst.frame).click( function(){ inst.setAllPerm("readonly"); });
        $("#dlg_read_write",inst.frame).click( function(){ inst.setAllPerm("readwrite"); });
        $("#dlg_grant_all",inst.frame).click( function(){ inst.setAllPerm(true); });
        $("#dlg_inherit_all",inst.frame).click( function(){ inst.setAllPerm(false); });
        $("#dlg_add_user",inst.frame).click( function(){ inst.addUser(); });
        $("#dlg_add_group",inst.frame).click( function(){ inst.addGroup(); });
        $("#dlg_rem",inst.frame).click( function(){ inst.remUserGroup(); });
        $("#dlg_edit",inst.frame).click( function(){ inst.editGroup(); });

        $("#dlg_view_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_VIEW )});
        $("#dlg_upd_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_UPDATE )});
        $("#dlg_admin_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_ADMIN )});
        //$("#dlg_tag_cb",inst.frame).on( "selectmenuchange", function(){ inst.selectHandler( $(this), PERM_TAG )});
        //$("#dlg_note_cb",inst.frame).on( "selectmenuchange", function(){ inst.selectHandler( $(this), PERM_NOTE )});
        $("#dlg_read_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_READ )});
        $("#dlg_write_cb",inst.frame).on( "change", function(){ inst.selectHandler( $(this), PERM_WRITE )});

        inst.public = item.public?true:false;

        aclView( item.id, function( ok, data ){
            if ( !ok || !data ) {
                //alert( "Could not get ACLs for " + item.id );
                alert( data );
                return;
            }
            //console.log("data",data);

            if ( !data.rule )
                data.rule = [];

            // Insert a default rule if not present (for UI needs)
            var ins_def = true;
            for ( var i in data.rule ){
                if ( data.rule[i].id == "default" ) {
                    ins_def = false;
                    break;
                }
            }

            if ( ins_def ){
                data.rule.push({id:"default",grant:0,inhgrant:0});
            }

            if ( data.rule ) {
                inst.orig_rules = data.rule.slice();
                inst.new_rules = data.rule;
            } else {
                inst.orig_rules = [];
                inst.new_rules = [];
            }

            var options = {
                title: "Sharing for " + (inst.is_coll?"Collection \"":"Data \"") + item.title + "\"",
                modal: true,
                width: inst.is_coll?550:450,
                height: 'auto',
                resizable: true,
                closeOnEscape: false,
                buttons: [{
                    text: "Ok",
                    click: function() {
                        var dlg_inst = $(this);

                        var is_public = $("#public_check",inst.frame).prop("checked");
                        console.log( "SAVE ACLS:", is_public, inst.new_rules );

                        aclUpdate( item.id, inst.new_rules, is_public, function( ok, data ){
                            if ( !ok )
                                alert( "ACL Update Failed", data.errMsg );
                            else
                                dlg_inst.dialog('destroy').remove();
                        });
                    }
                },{
                    text: "Cancel",
                    click: function() {
                        $(this).dialog('destroy').remove();
                    }
                }],
                open: function(event,ui){
                    $("#dlg_id",inst.frame).html((item.alias?"("+item.alias+")":"["+item.id.substr(2)+"]") );
                    var src = inst.buildTreeSource( inst.orig_rules );

                    $("#dlg_rule_tree",inst.frame).fancytree({
                        extensions: ["themeroller"],
                        themeroller: {
                            activeClass: "ui-state-hover",
                            addClass: "",
                            focusClass: "",
                            hoverClass: "ui-state-active",
                            selectedClass: ""
                        },
                        source: src,
                        selectMode: 1,
                        lazyLoad: function( event, data ) {
                            if ( data.node.key.startsWith("g/")){
                                data.result = {
                                    url: "/api/grp/view?uid="+encodeURIComponent(inst.uid)+"&gid="+encodeURIComponent(data.node.key.substr(2)),
                                    cache: false
                                };
                            }
                        },
                        postProcess: function( event, data ) {
                            console.log("post proc",data);
                            if ( data.node.key.startsWith("g/")){
                                data.node.setTitle( data.response.title + " (" +data.response.gid + ")" );
                                data.result = [];
                                if ( data.response.desc )
                                    data.result.push({title: "["+data.response.desc+"]", icon: false });

                                if ( data.response.member && data.response.member.length ){
                                    for ( var i in data.response.member ) {
                                        data.result.push({ title: data.response.member[i].substr(2), icon:"ui-icon ui-icon-person" });
                                    }
                                }else{
                                    data.result.push({ title: "(empty)", icon: false  });
                                }
                            }
                        },
                        activate: function( event, data ) {
                            inst.updateSelection( data.node.key, data.node.data.rule );
                        },
                    });
                }
            };

            inst.frame.dialog( options );
            $(".btn",inst.frame).button();
            $(":checkbox",inst.frame).checkboxradio();
            $("#public_check",inst.frame).checkboxradio();
            $("#public_check",inst.frame).prop("checked",item.ispublic);
            $("#public_check",inst.frame).checkboxradio("refresh");

            inst.disablePermControls( true );
            $("#dlg_edit",inst.frame).button("disable");
            $("#dlg_rem",inst.frame).button("disable");

            // Switch dialog to fixed-hieght mode
            var height = inst.frame.parent().height();
            inst.frame.dialog( "option", "height", height + 10 );
        });
    }

    this.buildTreeSource = function( rules ){
        var user_rules = [];
        var group_rules = [];
        var def_rule = null;
        var sub;

        for ( var i in rules ){
            sub = rules[i];

            if ( sub.id.startsWith( "u/" ))
                user_rules.push({title:sub.id.substring(2),icon:"ui-icon ui-icon-person",key:sub.id,rule:sub });
            else if ( sub.id.startsWith( "g/" ))
                group_rules.push({title:sub.id.substring(2),icon:"ui-icon ui-icon-persons",key:sub.id,rule:sub,folder:true,lazy:true });
            else
                def_rule = sub;
        }

        var src = [
            {title:"Default",icon:"ui-icon ui-icon-settings",folder:false,key:"default",rule:def_rule },
            {title:"Groups",icon:"ui-icon ui-icon-folder",folder:true,expanded:true,children:group_rules,key:"groups"},
            {title:"Users",icon:"ui-icon ui-icon-folder",folder:true,expanded:true,children:user_rules,key:"users"}
        ];

        return src;
    }

    this.selectHandler = function( obj, perm ){
        if ( inst.cur_rule ) {
            if (obj.prop("checked")) {
                inst.cur_rule.grant |= perm;
            } else {
                inst.cur_rule.grant &= (PERM_ALL & ~perm);
            }
        }
    }

    this.selectInhHandler = function( obj, perm ){
        if ( inst.cur_rule ) {
            if (obj.prop("checked")) {
                inst.cur_rule.inhgrant |= perm;
            } else {
                inst.cur_rule.inhgrant &= (PERM_ALL & ~perm);
            }
        }
    }

    this.setAllPerm = function( value ){
        if ( inst.cur_rule ){
            if ( value == "readonly" ){
                inst.cur_rule.grant = PERM_READONLY;
            } else if ( value == "readwrite" ){
                inst.cur_rule.grant = PERM_READWRITE;
            } else if ( value ){
                inst.cur_rule.grant = PERM_ALL;
            } else {
                inst.cur_rule.grant = 0;
            }
        }
        if ( value == "readonly" || value == "readwrite" ){
            inst.setPermsFromRule( inst.cur_rule );
        } else {
            $("#dlg_view_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_upd_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_admin_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            //$("#dlg_tag_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            //$("#dlg_note_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_read_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_write_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_create_cb",this.frame).prop("checked",value).checkboxradio("refresh");
        }
    }

    this.setAllPermInh = function( value ){
        if ( inst.cur_rule ){
            if ( value == "readonly" ){
                inst.cur_rule.inhgrant = PERM_READONLY;
            } else if ( value == "readwrite" ){
                inst.cur_rule.inhgrant = PERM_READWRITE;
            } else if ( value ){
                inst.cur_rule.inhgrant = PERM_ALL;
            } else {
                inst.cur_rule.inhgrant = 0;
            }
        }

        if ( value == "readonly" || value == "readwrite" ){
            inst.setPermsFromRule( inst.cur_rule );
        } else {
            $("#dlg_inh_view_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_inh_upd_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_inh_admin_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            //$("#dlg_inh_tag_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            //$("#dlg_inh_note_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_inh_read_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_inh_write_cb",this.frame).prop("checked",value).checkboxradio("refresh");
            $("#dlg_inh_create_cb",this.frame).prop("checked",value).checkboxradio("refresh");
        }
    }

    this.setPermsFromRule = function( rule ){
        //console.log( "setPermsFromRule", rule );
        if ( !rule ) {
            inst.setAllPerm(false);
            if ( inst.is_coll )
                inst.setAllPermInh(false);
        } else {
            inst.setPerm( "#dlg_view_cb", rule, PERM_VIEW );
            inst.setPerm( "#dlg_upd_cb", rule, PERM_UPDATE );
            inst.setPerm( "#dlg_admin_cb", rule, PERM_ADMIN );
            //inst.setPerm( "#dlg_tag_cb", rule, PERM_TAG );
            //inst.setPerm( "#dlg_note_cb", rule, PERM_NOTE );
            inst.setPerm( "#dlg_read_cb", rule, PERM_READ );
            inst.setPerm( "#dlg_write_cb", rule, PERM_WRITE );
            inst.setPerm( "#dlg_create_cb", rule, PERM_CREATE );
            if ( inst.is_coll ) {
                inst.setPermInh( "#dlg_inh_view_cb", rule, PERM_VIEW );
                inst.setPermInh( "#dlg_inh_upd_cb", rule, PERM_UPDATE );
                inst.setPermInh( "#dlg_inh_admin_cb", rule, PERM_ADMIN );
                //inst.setPermInh( "#dlg_inh_tag_cb", rule, PERM_TAG );
                //inst.setPermInh( "#dlg_inh_note_cb", rule, PERM_NOTE );
                inst.setPermInh( "#dlg_inh_read_cb", rule, PERM_READ );
                inst.setPermInh( "#dlg_inh_write_cb", rule, PERM_WRITE );
                inst.setPermInh( "#dlg_inh_create_cb", rule, PERM_CREATE );
            }
        }
    }

    inst.setPerm = function( id, rule, perm ) {
        $(id,this.frame).prop("checked",(rule.grant & perm)?true:false).checkboxradio("refresh");
    }

    inst.setPermInh = function( id, rule, perm ) {
        $(id,this.frame).prop("checked",(rule.inhgrant & perm)?true:false).checkboxradio("refresh");
    }

    this.disablePermControls = function( disabled ){
        if ( inst.disable_state === disabled )
            return;

        if ( disabled ){
            inst.setAllPerm(false);
            $(":checkbox:not(#public_check)",inst.frame).checkboxradio("disable");
            $("#dlg_read_only",inst.frame).button("disable");
            $("#dlg_read_write",inst.frame).button("disable");
            $("#dlg_grant_all",inst.frame).button("disable");
            $("#dlg_inherit_all",inst.frame).button("disable");
        }else{
            $(":checkbox:not(#public_check)",inst.frame).checkboxradio("enable");
            $("#dlg_read_only",inst.frame).button("enable");
            $("#dlg_read_write",inst.frame).button("enable");
            $("#dlg_grant_all",inst.frame).button("enable");
            $("#dlg_inherit_all",inst.frame).button("enable");
        }

        if ( inst.is_coll ) {
            if ( disabled ){
                inst.setAllPermInh(false);
                $("#dlg_inh_read_only",inst.frame).button("disable");
                $("#dlg_inh_read_write",inst.frame).button("disable");
                $("#dlg_inh_grant_all",inst.frame).button("disable");
                $("#dlg_inh_inherit_all",inst.frame).button("disable");
            }else{
                $("#dlg_inh_read_only",inst.frame).button("enable");
                $("#dlg_inh_read_write",inst.frame).button("enable");
                $("#dlg_inh_grant_all",inst.frame).button("enable");
                $("#dlg_inh_inherit_all",inst.frame).button("enable");
            }
        }

        inst.disable_state = disabled;
    }

    this.updateSelection = function( key, rule ){
        //console.log("updateSelection",key,rule);

        inst.cur_rule = null;
        for ( var i in inst.new_rules ) {
            if ( inst.new_rules[i].id == key ) {
                inst.cur_rule = inst.new_rules[i];
                break;
            }
        }

        if ( key.startsWith( "u/" )) {
            inst.disablePermControls( false );
            inst.setPermsFromRule( rule );
            $("#dlg_edit",inst.frame).button("disable");
            $("#dlg_rem",inst.frame).button("enable" );
        } else if ( key.startsWith("g/")) {
            inst.disablePermControls(false,(key=='g/members'?true:false));
            inst.setPermsFromRule(rule);
            $("#dlg_edit",inst.frame).button("enable");
            $("#dlg_rem",inst.frame).button("enable" );
        } else if ( key == "default" ) {
            inst.disablePermControls( false );
            inst.setPermsFromRule( rule );
            $("#dlg_edit",inst.frame).button("disable");
            $("#dlg_rem",inst.frame).button("disable");
        } else {
            inst.disablePermControls( true );
            $("#dlg_edit",inst.frame).button("disable");
            $("#dlg_rem",inst.frame).button("disable");
        }
    }

    this.addUser = function(){
        var excl = inst.excl.slice();
        for ( i in inst.new_rules ){
            rule = inst.new_rules[i];
            if ( rule.id.startsWith( "u/" ))
                excl.push( rule.id );
        }

        dlgPickUser.show( inst.uid, excl, false, function( uids ){
            if ( uids.length > 0 ){
                var tree = $("#dlg_rule_tree",inst.frame).fancytree("getTree");
                var i,id,rule;
                for ( i in uids ){
                    id = uids[i];
                    if ( inst.excl.indexOf( id ) == -1 && !tree.getNodeByKey( id )){
                        rule = {id: id, grant: 0, inhgrant:0 };
                        inst.new_rules.push( rule );
                        tree.rootNode.children[2].addNode({title: id.substr(2),icon:false,key:id,rule:rule });
                    }
                }
                tree.activateKey( uids[0] );
            }
        });
    }

    this.addGroup = function(){
        var rule, node, gid, i;

        var excl = inst.excl.slice();
        for ( i in inst.new_rules ){
            rule = inst.new_rules[i];
            if ( rule.id.startsWith( "g/" ))
                excl.push( rule.id );
        }

        dlgGroups.show( inst.uid, excl, function( gids ){
            groupList( inst.uid, function( ok, groups ){
                var tree = $("#dlg_rule_tree",inst.frame).fancytree("getTree");

                if ( ok ){
                    for ( i in inst.new_rules ){
                        rule = inst.new_rules[i];
                        node = tree.getNodeByKey( rule.id );

                        if ( rule.id.startsWith( "g/" )){
                            gid = rule.id.substr(2);
                            group = groups.find( function(elem){ return elem.gid == gid } );
                            if ( group ){
                                node.resetLazy();
                                node.setTitle( group.title + " (" + gid + ")");
                            }else{
                                inst.new_rules.splice(i,1);
                                node.remove();
                            }
                        }
                    }
                }

                if ( gids && gids.length > 0 ){
                    node = tree.getNodeByKey("groups");

                    for ( i in gids ){
                        gid = gids[i];
                        if ( !tree.getNodeByKey( gid )){
                            rule = {id: gid, grant: 0, inhgrant:0 };
                            inst.new_rules.push( rule );
                            if ( ok ){
                                gid = gid.substr(2);
                                group = groups.find( function(elem){ return elem.gid == gid } );
                                tree.rootNode.children[1].addNode({title:group.title + " (" + gid + ")",icon:false,key:"g/"+gid,rule:rule,folder:true,lazy:true });
                            }else
                                tree.rootNode.children[1].addNode({title:gid.substr(2),icon:false,key:gid,rule:rule,folder:true,lazy:true });
                        }
                    }

                    tree.activateKey( gids[0] );
                }
            });
        }, true );
    }

    this.editGroup = function(){
        var tree = $("#dlg_rule_tree",inst.frame).fancytree("getTree");
        var node = tree.getActiveNode();
        if ( node ){
            groupView( inst.uid, node.key, function( ok, group ){
                if ( ok ){
                    dlgGroupEdit.show( inst.uid, inst.excl, group, function( group_new ){
                        if ( group_new ){
                            node.setTitle( group_new.title + " (" +group_new.gid + ")");
                            node.resetLazy();
                        }
                    });
                }
            });
        }
    }

    this.remUserGroup = function(){
        if ( inst.cur_rule ){
            var key = inst.cur_rule.id;
            if ( key == "default" )
                return;
            if ( key == "g/members" )
                return;

            var tree = $("#dlg_rule_tree",inst.frame).fancytree("getTree");
            var node = tree.getActiveNode();
            if ( node.key == key ){
                for ( var i in inst.new_rules ) {
                    if ( inst.new_rules[i].id == key ){
                        inst.new_rules.splice( i, 1 );
                        break;
                    }
                }
                inst.cur_rule = null;
                inst.disablePermControls( true );
                node.remove();
            }
        }
    }
}
