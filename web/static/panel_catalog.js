import * as util from "./util.js";
import * as settings from "./settings.js";
import * as panel_info from "./panel_item_info.js";

export function makeCatalogPanel( a_id, a_frame, a_parent ){
    var inst = this;

    this.tree_div = $(a_id,a_frame);

    $("#catalog_tree", a_frame ).fancytree({
        toggleEffect: false,
        extensions: ["themeroller","dnd5"],
        themeroller: {
            activeClass: "my-fancytree-active",
            addClass: "",
            focusClass: "",
            hoverClass: "my-fancytree-hover",
            selectedClass: ""
        },
        dnd5:{
            scroll: false,
            preventForeignNodes: true,
            dropEffectDefault: "copy",
            dragStart: function(node, data) {
                console.log( "dnd start" );

                if ( node.data.nodrag )
                    return false;

                var key = node.key;

                if ( node.key.startsWith("t/")){
                    if ( node.data.scope ){
                        key = node.data.scope;
                    }else{
                        key = node.title.toLowerCase();
                        while ( node.parent && !node.parent.data.nodrag ){
                            node = node.parent;
                            key = node.title.toLowerCase() + "." + key;
                        }
                    }
                }
                

                data.dataTransfer.setData("text/plain",key);

                return true;
            }
        },
        source:[
            {title:"By Topic <i class='browse-reload ui-icon ui-icon-reload'></i>",checkbox:false,folder:true,icon:"ui-icon ui-icon-structure",lazy:true,nodrag:true,key:"topics",offset:0}
        ],
        selectMode: 1,
        activate: function( event, data ) {
            data.node.setSelected( true );
            panel_info.showSelectedInfo( data.node );
        },
        select: function( event, data ) {
            a_parent.updateBtnState();
        },
        collapse: function( event, data ) {
            if ( data.node.isLazy() ){
                data.node.resetLazy();
            }
        },
        renderNode: function(ev,data){
            if ( data.node.data.hasBtn ){
                $(".btn",data.node.li).button();
            }
        },
        click: function(event, data) {
            if ( event.which == null ){
                // RIGHT-CLICK CONTEXT MENU

                // Enable/disable actions
                inst.tree_div.contextmenu("enableEntry", "unlink", false );
                inst.tree_div.contextmenu("enableEntry", "cut", false );
                inst.tree_div.contextmenu("enableEntry", "paste", false );
                inst.tree_div.contextmenu("enableEntry", "new", false );

                if ( data.node.key.charAt(0) == 'd' ){
                    inst.tree_div.contextmenu("enableEntry", "actions", true );
                    inst.tree_div.contextmenu("enableEntry", "copy", true );
                }else if ( data.node.key.charAt(0) == 'c' ){
                    inst.tree_div.contextmenu("enableEntry", "actions", true );
                    inst.tree_div.contextmenu("enableEntry", "graph", false );
                    inst.tree_div.contextmenu("enableEntry", "put", false );
                    inst.tree_div.contextmenu("enableEntry", "copy", false );
                    inst.tree_div.contextmenu("enableEntry", "move", false );
                }else{
                    inst.tree_div.contextmenu("enableEntry", "actions", false );
                    inst.tree_div.contextmenu("enableEntry", "copy", false );
                }
            }else if ( data.targetType == "icon" && data.node.isFolder() ){
                data.node.toggleExpanded();
            }

        },
        lazyLoad: function( event, data ) {
            if ( data.node.key == "topics" ) {
                data.result = {
                    url: "/api/top/list?offset="+data.node.data.offset+"&count="+settings.opts.page_sz,
                    cache: false
                };
            } else if ( data.node.key.startsWith( "t/" )){
                data.result = {
                    url: "/api/top/list?id=" + encodeURIComponent( data.node.key ) + "&offset="+data.node.data.offset+"&count="+settings.opts.page_sz,
                    cache: false
                };
            } else if ( data.node.key.startsWith( "c/" )){
                data.result = {
                    url: "/api/col/read?offset="+data.node.data.offset+"&count="+settings.opts.page_sz+"&id=" + encodeURIComponent( data.node.key ),
                    cache: false
                };
            }
        },
        postProcess: function( event, data ) {
            if ( data.node.key == "topics" || data.node.key.startsWith("t/") || data.node.key.startsWith("c/" )) {
                data.result = [];
                var item,entry;
                var items = data.response.item;
                var scope = data.node.data.scope;

                //console.log("topic resp:",data.response);

                if ( data.response.offset > 0 || data.response.total > (data.response.offset + data.response.count) ){
                    var pages = Math.ceil(data.response.total/settings.opts.page_sz), page = 1+data.response.offset/settings.opts.page_sz;
                    data.result.push({title:"<button class='btn small''"+(page==1?" disabled":"")+" onclick='pageLoadCat(\""+data.node.key+
                        "\",0)'>First</button> <button class='btn small'"+(page==1?" disabled":"")+" onclick='pageLoadCat(\""+data.node.key+
                        "\","+(page-2)*settings.opts.page_sz+")'>Prev</button> Page " + page + " of " + pages + " <button class='btn small'"+
                        (page==pages?" disabled":"")+" onclick='pageLoadCat(\""+data.node.key+"\","+page*settings.opts.page_sz+
                        ")'>Next</button> <button class='btn small'"+(page==pages?" disabled":"")+" onclick='pageLoadCat(\""+
                        data.node.key+"\","+(pages-1)*settings.opts.page_sz+")'>Last</button>",folder:false,icon:false,checkbox:false,hasBtn:true});
                }

                for ( var i in items ) {
                    item = items[i];
                    if ( item.id[0]=="t" ){
                        if ( item.title.startsWith("u/") ){
                            entry = { title: item.title.substr(2),folder:true,lazy:true,key:item.id,scope:item.title,icon:"ui-icon ui-icon-person",offset:0};
                        }else if ( item.title.startsWith("p/") ){
                            entry = { title: item.title.substr(2),folder:true,lazy:true,key:item.id,scope:item.title,icon:"ui-icon ui-icon-box",offset:0 };
                        }else{
                            entry = { title: item.title.charAt(0).toUpperCase() + item.title.substr(1),folder:true,lazy:true,key:item.id,icon:"ui-icon ui-icon-grip-solid-horizontal",offset:0 };
                        }
                    }else if ( item.id[0]=="c" ){
                        entry = { title: util.generateTitle(item),folder:true,lazy:true,key:item.id,offset:0,scope:item.owner?item.owner:scope };
                    }else{ // data records
                        entry = { title: util.generateTitle(item),key:item.id,icon:item.doi?"ui-icon ui-icon-linkext":"ui-icon ui-icon-file",checkbox:false,doi:item.doi,scope:item.owner?item.owner:scope };
                    }

                    data.result.push( entry );
                }
            }

            if ( data.result && data.result.length == 0 ){
                data.result.push({title:"(empty)",icon:false,checkbox:false,nodrag:true});
            }
        },
    });

    this.tree = $.ui.fancytree.getTree( "#catalog_tree", a_frame );

    return this;
}