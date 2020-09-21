import * as util from "./util.js";
import * as api from "./api.js";
import * as model from "./model.js";
import * as settings from "./settings.js";
import * as panel_info from "./panel_item_info.js";
import * as dlgPickUser from "./dlg_pick_user.js";
import * as dlgPickProj from "./dlg_pick_proj.js";

export function newCatalogPanel( a_id, a_frame, a_parent ){
    return new CatalogPanel( a_id, a_frame, a_parent );
}

function CatalogPanel( a_id, a_frame, a_parent ){

    $( "#cat_coll_tree", a_frame ).fancytree({
        toggleEffect: false,
        extensions: ["themeroller"],
        themeroller: {
            activeClass: "my-fancytree-active",
            hoverClass: ""
        },
        source: [],
        nodata: false,
        selectMode: 2,
        activate: function( event, data ) {
            if ( keyNav ){
                cat_tree.selectAll(false);
                data.node.setSelected(true);
                keyNav = false;
            }

            panel_info.showSelectedInfo( data.node, a_parent.checkTreeUpdate );
        },
        select: function( event, data ) {
            if ( data.node.isSelected() ){
                data.node.visit( function( node ){
                    node.setSelected( false );
                });
                var parents = data.node.getParentList();
                for ( var i in parents ){
                    parents[i].setSelected( false );
                }
            }

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
            if ( data.targetType == "icon" && data.node.isFolder() ){
                data.node.toggleExpanded();
            } else if ( !search_sel_mode ) {
                if ( data.originalEvent.shiftKey && (data.originalEvent.ctrlKey || data.originalEvent.metaKey)) {
                    util.treeSelectRange( cat_tree, data.node );
                }else if ( data.originalEvent.ctrlKey || data.originalEvent.metaKey ) {
                    if ( data.node.isSelected() ){
                        data.node.setSelected( false );
                    }else{
                        data.node.setSelected( true );
                    }
                }else if ( data.originalEvent.shiftKey ) {
                    cat_tree.selectAll(false);
                    util.treeSelectRange( cat_tree, data.node );
                }else{
                    cat_tree.selectAll(false);
                    data.node.setSelected( true );
                }
            }
        },
        keydown: function(ev, data) {
            if( ev.keyCode == 38 || ev.keyCode == 40 ){
                keyNav = true;
            }
        },
        lazyLoad: function( event, data ) {
            if ( data.node.key.startsWith( "t/" )){
                data.result = { url: api.topicList_url( data.node.key, data.node.data.offset, settings.opts.page_sz ), cache: false };
            } else if ( data.node.key.startsWith( "c/" )){
                data.result = { url: api.collRead_url( data.node.key, data.node.data.offset, settings.opts.page_sz ), cache: false };
            }
        },
        postProcess: function( event, data ) {
            console.log("cat tree post proc:", data );
            if ( data.node.parent ){
                data.result = [];
                var item,entry;
                var items = data.response.item;
                var scope = data.node.data.scope;

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
                    if ( item.id[0]=="c" ){
                        entry = { title: util.generateTitle(item),folder:true,lazy:true,key:item.id,offset:0,scope:item.owner?item.owner:scope };
                    }else{ // data records
                        entry = { title: util.generateTitle(item),key:item.id, icon: util.getDataIcon( item ),
                            checkbox:false, doi:item.doi, scope:item.owner?item.owner:scope, size:item.size };
                    }

                    data.result.push( entry );
                }

                if ( data.result && data.result.length == 0 ){
                    data.result.push({title:"(empty)",icon:false,checkbox:false,nodrag:true});
                }
            }else{
                data.result = data.response;
            }
        },
    });


    //this.tree_div = $(a_id,a_frame);
    //this.tree = cat_tree;

    var cat_panel = $(".cat-panel"),
        cur_topic_div = $("#cat_cur_topic",cat_panel),
        cur_topic = [],
        back_btn = $(".btn-cat-back",cat_panel),
        top_res_div = $("#cat_topic_result_div",cat_panel),
        cat_coll_div = $("#cat_coll_div",cat_panel),
        topics_panel = $(".topics-div",cat_panel),
        topics_div = $("#cat_topics_div",cat_panel),
        cur_coll = {},
        cur_sel = null,
        cat_tree_div = $("#cat_coll_tree", cat_panel),
        cat_tree = $.ui.fancytree.getTree( "#cat_coll_tree", cat_panel ),
        keyNav = false,
        search_sel_mode = false,
        coll_qry = { tags: [], offset: 0, count: 50 },
        topic_tags = [], user_tags = [],
        tags_div = $("#cat_tags_div",cat_panel),
        topic_search_path = {},
        loading = 0;

        //coll_div_title = $("#coll_div_title",cat_panel);
        

    const icon_open = "ui-icon-plus",
        icon_close = "ui-icon-close";

    $(".btn",cat_panel).button();

    this.getSelectedNodes = function(){
        if ( cat_tree_div.is( ":visible" )){
            return cat_tree.getSelectedNodes();
        }else if ( cur_sel ){
            return [{key: cur_sel, data: {}}];
        }else{
            return [];
        }
    }

    this.getActiveNode = function(){
        if ( cat_tree_div.is( ":visible" ))
            return cat_tree.activeNode;
        else if ( cur_sel ){
            return {key: cur_sel, data: {}};
        }else{
            return null;
        }
    }

    function setTopicPath(){
        var topic;

        if ( cur_topic.length ){
            topic = "";
            for ( var i in cur_topic ){
                if ( topic.length ){
                    if ( cur_topic[i].id.charAt(0) == 't' )
                        topic += ".";
                    else
                        topic += " - ";
                }
                topic += cur_topic[i].title;
            }
        }else{
            topic = "Home";
        }

        cur_topic_div.text( topic );
    }

    function updateTopicNav(){
        if ( !loading ){
            $(".btn-cat-home,.cat-topic-result",cat_panel).button("enable");
            back_btn.button( cur_topic.length?"enable":"disable" );
            $(".cat-topic-div",topics_div).removeClass("ui-button-disabled ui-state-disabled");
            $(".btn",topics_div).button("enable");
            panel_info.showSelectedInfo();
        }
    }

    function loadTopics( a_topic_id, a_cb ){
        topics_div.html( "Loading..." );
        $(".btn-cat-home,.btn-cat-back,.cat-topic-result",cat_panel).button("disable");
        loading |= 1;

        api.topicListTopics( a_topic_id, null, null, function( ok, data ){
            loading &= 2;

            if ( ok ){
                setTopics( data );
            }

            updateTopicNav();

            if ( a_cb )
                a_cb( ok );
        });

    }

    function onTopicClick( ev ){
        if ( loading )
            return;

        var topic = $(this).closest(".cat-topic"),
            name = topic.attr("data");

        cur_topic.push({ title: name, id: topic[0].id });
        setTopicPath();

        loadTopics( topic[0].id );

        topic_tags.push( name );
        loadCollections();

        ev.stopPropagation()
    }

    function onTopicActivate( ev ){
        var el = $(this);

        $(".cat-topic-div",topics_div).removeClass("ui-state-active");
        $(".cat-topic-div",el).addClass("ui-state-active");

        console.log("topic ID",el[0].id);

        panel_info.showSelectedInfo( el[0].id );
        a_parent.updateBtnState();

        ev.stopPropagation()
    }

    function onSearchTopicClick( ev ){
        var topic_id = $(this)[0].id;

        //topic = $(this)[0].innerHTML,

        //console.log("topic",topic);
        if ( cat_tree_div.is( ":visible" )){
            closeCollTree();
        }else{
            cur_sel = null;
            a_parent.updateBtnState();
        }

        if ( topic_id in topic_search_path ){
            cur_topic = topic_search_path[topic_id];
        }else{
            cur_topic = [];
        }

        topic_tags = [];
        for ( var i in cur_topic )
            topic_tags.push( cur_topic[i].title );

        setTopicPath();

        loadTopics( topic_id );

        loadCollections();
    }

    function onCollectionActivate( ev ){
        console.log("coll activate");
        var el = $(this), coll = el[0];
        //console.log("this",$(this));

        $(".cat-coll-title-div,.cat-item-title",cat_coll_div).removeClass("ui-state-active");
        $(".cat-coll-title-div",el).addClass("ui-state-active");

        panel_info.showSelectedInfo( coll.id );
        cur_sel = coll.id;
        a_parent.updateBtnState();

        /*api.collView( coll.id, function( ok, data ){
            if ( ok ){
                panel_info.showSelectedInfo( coll.id );
                cur_sel = coll.id;
                a_parent.updateBtnState();
            }else{
                dialogs.dlgAlert("Error Reading Collection",data);
            }
        });*/

        ev.stopPropagation()
    }


    /*
    function onDataActivate( ev ){
        console.log("data activate");
        var el = $(this), item = el.parent()[0], func;
        //console.log("this",$(this));
        if ( item.id.startsWith( "c/" ))
            func = api.collView;
        else
            func = api.dataView;

        func( item.id, function( ok, data ){
            if ( ok ){
                panel_info.showSelectedInfo( item.id );
                $(".cat-item-title,.cat-coll-title-div",cat_coll_div).removeClass("ui-state-active");
                el.addClass("ui-state-active");
            }else{
                dialogs.dlgAlert("Error Reading Item",data);
            }
        });

        ev.stopPropagation()
    }*/

    function openCollTree( a_coll_id ){
        var coll = cur_coll[a_coll_id];

        console.log("load coll ", coll );

        cat_coll_div.hide();
        topics_panel.hide();

        cat_tree.reload([{title: util.generateTitle( coll ), key: a_coll_id, scope: coll.owner, folder: true, lazy: true, selected: true }])
            .done( function(){
                console.log("loaded tree",cat_tree.rootNode);
                cat_tree.rootNode.children[0].setExpanded();
            });

        cat_tree_div.show();
        a_parent.updateBtnState();

        /*api.collRead( a_coll_id, 0, 100, function( ok, data ){
            if ( ok ){
                setData( data, cat_item_div );
            }else{
                dialogs.dlgAlert("Error Reading Collection",data);
                cat_item_div.html( "(faile to load colelction)" );
            }
        })*/
    }

    function closeCollTree( a_coll_id ){
        cat_tree_div.hide();
        cur_sel = null;

        cat_tree.reload([]);

        cat_coll_div.show();
        topics_panel.show();

        a_parent.updateBtnState();
    }

    function onCollectionOpen( ev ){
        var el = $(this),
            coll=el.closest(".cat-coll");
            /*
            coll_title_div = $(".cat-coll-title-div", coll ),
            cat_item_div = $(".cat-item-div", coll );
            */

        /*if ( cat_item_div.length ){
            coll.siblings().show();
            topics_panel.show();
            //topic_header.show();
            //coll_div_title.text("Collections");
            cat_item_div.remove();
            $(".btn-cat-coll-open span", coll_title_div ).removeClass( icon_close ).addClass( icon_open ).css("visibility","");
        }else{*/

            cur_topic.push({ title: $(".cat-coll-title",coll).text(), id: coll[0].id });
            setTopicPath();

            openCollTree( coll[0].id );

            /*
            coll.siblings().hide();
            topics_panel.hide();
            //topic_header.hide();
            //coll_div_title.text();
            $(".cat-item-div", cat_coll_div ).remove();
            coll_title_div.removeClass("ui-state-active");
            $(".btn-cat-coll-open span", coll_title_div ).removeClass( icon_open ).addClass( icon_close ).css("visibility","visible");

            coll.append("<div class='cat-item-div' style='padding-left:0'>(loading...)</div>");
            cat_item_div  = $( ".cat-item-div", coll );
            //cat_item_div.html( "(loading...)" );

            api.collRead( coll[0].id, 0, 100, function( ok, data ){
                if ( ok ){
                    setData( data, cat_item_div );
                }else{
                    dialogs.dlgAlert("Error Reading Collection",data);
                    cat_item_div.html( "(faile to load colelction)" );
                }
            })
            */

            ev.stopPropagation()
        //}
    }

    /*function onFolderOpenClose( ev ){
        var el = $(this),
            coll=el.closest(".cat-item"),
            cat_item_div = $(".cat-item-div",coll);

        if ( cat_item_div.length ){
            cat_item_div.remove();
            coll.siblings().show();
            $(".btn-cat-folder-open span", coll ).removeClass( icon_close ).addClass( icon_open );
        }else{
            $(".btn-cat-folder-open span", coll ).removeClass( icon_open ).addClass( icon_close );

            api.collRead( coll[0].id, 0, 100, function( ok, data ){
                if ( ok ){
                    coll.siblings().hide();
                    coll.append("<div class='cat-item-div'>(loading...)</div>");
                    cat_item_div = $( ".cat-item-div", coll );
                    //cat_item_div = coll.next();

                    setData( data, cat_item_div );
                }else{
                    dialogs.dlgAlert("Error Reading Collection",data);
                    cat_item_div.html( "(faile to load colelction)" );
                }
            });
        }
    }*/


    function setTopics( data ){
        var html = "";
        if ( data.topic && data.topic.length ){
            var topic;
            for ( var i in data.topic ){
                topic = data.topic[i];
                //ui-button cat-topic
                html += "<div class='cat-topic' id='" + topic.id + "' data='"+topic.title+"'>\
                    <div class='cat-topic-div ui-button ui-corner-all"+(loading?" ui-button-disabled ui-state-disabled":"")+"' style='display:block;text-align:left'>\
                        <div class='row-flex'>\
                            <div style='flex:1 1 auto;padding-top:2px'>" + topic.title.charAt(0).toUpperCase() + topic.title.substr(1) + "</div>\
                            <div class='cat-topic-btn-div' style='flex:none'><button class='btn btn-icon btn-cat-topic-open'" +
                            (loading?"disabled":"") +
                            "><span class='ui-icon ui-icon-play'></span></button></div>\
                        </div>\
                    </div>\
                </div>";
            }
        }else{
            html = "<div class='cat-topic-empty'>No Categories</div>";
        }

        topics_div.html( html );
        $(".btn",topics_div).button();
    }

    function setSearchTopics( data ){
        var html = "";
        if ( data.topic && data.topic.length ){
            var topic;
            topic_search_path = {};
            for ( var i in data.topic ){
                topic = data.topic[i];
                topic_search_path[topic.id] = topic.path;
                //html += "<div class='cat-topic-result ui-button ui-corner-all' id='" + topic.id + "'>" + topic.title + "</div>";
                html += "<button class='cat-topic-result btn' id='" + topic.id + "'>" + topic.title + "</button>";
            }
            top_res_div.html( html );
            $(".btn",top_res_div).button();
        }else{
            html = "<div class='cat-topic-result-empty'>No Matches</div>";
            top_res_div.html( html );
        }
    }

    function setCollections( data ){
        console.log("setCollections",data);
        var html = "", item;
        if ( data.coll && data.coll.length ){
            cur_coll = {};

            //console.log("data",data);
            for ( var i in data.coll ){
                //if ( html )
                //    html += "<hr>";
                item = data.coll[i];
                cur_coll[item.id] = item;

                html +=
                    "<div class='cat-coll' id='" + item.id + "'>\
                        <div class='cat-coll-title-div ui-widget-content ui-corner-all ui-button'>\
                            <div class='row-flex'>\
                                <div class='cat-coll-title'>" + item.title + "</div>\
                                <div class='cat-coll-notes'>" + (item.notes?"&nbsp;"+util.generateNoteSpan(item)+"&nbsp;":"") + "</div>\
                                <div class='cat-coll-btn-div'>\
                                    <button class='btn btn-icon btn-cat-coll-open'><span class='ui-icon "+ icon_open + "'></span></button>\
                                </div>\
                            </div>\
                            <div class='cat-coll-info-div'>\
                                <div class='cat-coll-info-brief'>"+ (item.brief?item.brief:"(no description)") + "</div>\
                                <div><table class='cat-coll-info-table'><tr><td>" + (item.ownerId.startsWith("u/")
                                    ?"Owner:</td><td>" + item.ownerName
                                    :"Project:</td><td>"+ item.ownerId.substr(2)) + "</td></tr>\
                                    <tr><td>Collection ID:</td><td>" + item.id + (item.alias?" ("+item.alias+")":"") + "</td></tr>" +
                                "</table></div>\
                            </div>\
                        </div>\
                    </div>";
            }
        }else{
            html = "<div class='cat-coll-empty'>No matching collections.<p>Try other categories and/or adjust collection filters.</p></div>"
        }

        //item.id + " " + (item.alias?item.alias:"") + " " +
        //(item.notes?"<tr><td>Annotations:</td><td>"+ util.generateNoteSpan(item) + "</td><tr>":"") +

        cat_coll_div.html( html );
        $(".btn",cat_coll_div).button();
        cur_sel = null;
        a_parent.updateBtnState();
    }

    function enableTopicUI( a_enable ){
        $(".btn-cat-home,.btn-cat-back,.cat-topic-result",cat_panel).button(a_enable?"enable":"disable");
    }

    /*
    function setData( a_data, a_container, a_parent ){
        console.log("setData",a_data);
        var html, item;

        if ( a_data.item && a_data.item.length ){
            //console.log("data",data);
            html = ""; //"<div class='cat-item-path'>Viewing <span class='cat-coll-cur-path'>/</span></div>";
            for ( var i in a_data.item ){
                item = a_data.item[i];
                if ( item.id.startsWith("d/")){
                    html +=
                    "<div class='cat-item' id='" + item.id + "'>\
                        <div class='cat-item-title row-flex'>\
                            <div style='flex:none'><span style='font-size:120%' class='ui-icon ui-icon-"+util.getDataIcon(item)+"'></span></div>\
                            <div class='' style='flex:1 1 auto'>&nbsp;" + item.title + "</div>\
                        </div>\
                    </div>";
                }else{
                    html += 
                    "<div class='cat-item' id='" + item.id + "'>\
                        <div class='cat-item-title cat-folder row-flex'>\
                            <div style='flex:none'><span style='font-size:120%' class='ui-icon ui-icon-"+util.getKeyIcon(item.id)+"'></span></div>\
                            <div class='' style='flex:1 1 auto'>&nbsp;" + item.title + "</div>\
                            <div style='flex:none'><button class='btn btn-icon btn-cat-folder-open'><span class='ui-icon "+icon_open+"'></span></button></div>\
                        </div>\
                    </div>";
                }
            }
        }else{
            html = "<div class='cat-data-empty'>No data data in this collection.</div>"
        }

        a_container.html( html );
       
        $(".btn",a_container).button();
    }
    */

    $(".btn-cat-home",cat_panel).on("click",function(){
        if ( cat_tree_div.is( ":visible" )){
            closeCollTree();
        }else{
            cur_sel = null;
            a_parent.updateBtnState();
        }

        cat_coll_div.html( "Loading..." );

        loadTopics( null, function(){
            cur_topic=[];
            cur_topic_div.text( "Home" );
        });

        topic_tags = [];

        loadCollections();
    });

    $(".btn-cat-back",cat_panel).on("click",function(){
        if ( cat_tree_div.is( ":visible" )){
            closeCollTree();
        }else{
            cur_sel = null;
            a_parent.updateBtnState();
        }

        cat_coll_div.html( "Loading..." );
        var top_id = cur_topic.length>1?cur_topic[cur_topic.length-2].id:null

        if ( cur_topic.length ){
            cur_topic.pop();
            setTopicPath();
        }

        topic_tags.pop();

        loadTopics( top_id );
        loadCollections();
    });


    $(".btn-cat-topic-res-cls",cat_panel).on("click",function(){
        $("#cat_topic_result_div").hide();
        $(".cat-search-div",cat_panel).hide();
    });

    function searchTopics(){
        var phrase = $("#cat_topic_search_phrase",cat_panel).val().trim();
        if ( phrase ){
            topics_panel.show();
            top_res_div.html( "(loading...)" ).show();

            api.topicSearch( phrase, function( ok, data ){
                //console.log("topicSearch handler",data);
                if ( ok ){
                    setSearchTopics( data );
                }else{
                    setSearchTopics({});
                    util.setStatusText( "Topic search error " + data, true );
                }
            });
        }else{
            setSearchTopics({});
        }
    }

    
    
    $(".btn-cat-search",cat_panel).on("click",function(){
        $(".cat-search-div",cat_panel).toggle();
    });

    $(".btn-cat-topic-search",cat_panel).on("click",function(){
        searchTopics();
    });

    $("#cat_topic_search_phrase").on('keypress', function (e) {
        if (e.keyCode == 13){
            searchTopics();
        }
    });

    top_res_div.html( "(loading...)" );

    loadTopics();
    loadCollections();

    topics_div.on("click", ".cat-topic", onTopicActivate );
    topics_div.on("dblclick", ".cat-topic", onTopicClick );
    topics_div.on("click", ".btn-cat-topic-open", onTopicClick );

    $("#cat_topic_result_div",cat_panel).on("click", ".cat-topic-result", onSearchTopicClick );
    cat_coll_div.on("click", ".cat-coll", onCollectionActivate );
    cat_coll_div.on("click", ".btn-cat-coll-open", onCollectionOpen );
    cat_coll_div.on("dblclick", ".cat-coll-title-div", onCollectionOpen );

    this.getCollectionQuery = function(){
        return coll_qry;
    }

    function loadCollections(){
        $(".btn-cat-home,.btn-cat-back,.cat-topic-result",cat_panel).button("disable");
        loading |= 2;

        cat_coll_div.html( "Loading..." );

        coll_qry.tags = topic_tags.concat( user_tags );

        var tmp = $("#cat_text_qry",cat_panel).val().trim();
        if ( tmp ){
            coll_qry.text = tmp;
        }else{
            delete coll_qry.text;
        }

        tmp = $("#cat_qry_owner",cat_panel).val().trim();
        if ( tmp ){
            coll_qry.owner = tmp;
        }else{
            delete coll_qry.owner;
        }

        console.log("col qry", coll_qry );
        api.collPubSearch( coll_qry, function( ok, data ){
            loading &= 1;

            if ( ok ){
                setCollections( data );
            }

            updateTopicNav();
        });
    }

    tags_div.tagit({
        autocomplete: {
            delay: 500,
            minLength: 3,
            source: "/api/tag/autocomp"
        },
        caseSensitive: false,
        removeConfirmation: true,
        afterTagAdded: function( ev, ui ){
            user_tags.push( ui.tagLabel );
            loadCollections();
        },
        beforeTagRemoved: function( ev, ui ){
            var idx = user_tags.indexOf( ui.tagLabel );
            if ( idx != -1 )
                user_tags.splice( idx, 1 );
            loadCollections();
        }
    });

    $(".tagit-new",cat_panel).css("clear","left");

    $("#cat_qry_tags_clear",cat_panel).on("click",function(){
        tags_div.tagit("removeAll");
        loadCollections();
    });

    var textTimer = null;

    $("#cat_text_qry,#cat_qry_owner",cat_panel).on("keypress",function( ev ){
        if ( ev.keyCode == 13 ){
            if ( textTimer )
                clearTimeout( textTimer );
            ev.preventDefault();
            loadCollections();
        }
    });

    $("#cat_text_qry,#cat_qry_owner",cat_panel).on("input",function( ev ){
        if ( textTimer )
            clearTimeout( textTimer );

        textTimer = setTimeout(function(){
            loadCollections();
            textTimer = null;
        },500);
    });

    $("#cat_qry_text_clear",cat_panel).on("click",function(){
        if ( textTimer )
            clearTimeout( textTimer );
        $("#cat_text_qry",cat_panel).val("");
        loadCollections();
    });

    $("#cat_qry_owner_pick_user",cat_panel).on("click",function(){
        dlgPickUser.show( "u/"+settings.user.uid, [], true, function( users ){
            $("#cat_qry_owner",cat_panel).val( users[0] );
            loadCollections();
        });
    });

    $("#cat_qry_owner_pick_proj",cat_panel).on("click",function(){
        dlgPickProj.show( [], true, function( proj ){
            $("#cat_qry_owner",cat_panel).val( proj[0] );
            loadCollections();
        });
    });

    $("#cat_qry_owner_clear",cat_panel).on("click",function(){
        if ( textTimer )
            clearTimeout( textTimer );
        $("#cat_qry_owner",cat_panel).val("");
        loadCollections();
    });

    var search_sel_mode = false;

    $("#cat_top_sidebar").resizable({
        handles:"s",
        stop: function(event, ui){
            /*
            var cellPercentH=100 * ui.originalElement.outerHeight()/ $(".topics-div",cat_panel).innerHeight();
            ui.originalElement.css('height', cellPercentH + '%');  
            var nextCell = ui.originalElement.next();
            var nextPercentH=100 * nextCell.outerHeight()/ $(".topics-div",cat_panel).innerHeight();
            nextCell.css('height', nextPercentH + '%');
            */
        }
    });

    util.inputTheme( $('input,textarea',cat_panel));

    this.setSearchSelectMode = function( a_enabled ){
        search_sel_mode = a_enabled;
        //cat_tree.setOption("checkbox",a_enabled);
    };

    model.registerUpdateListener( function( a_data ){
        //console.log("cat panel updating:",a_data);

        /*var data;
        // Find impacted nodes in catalog tree and update title
        cat_tree.visit( function(node){
            if ( node.key in a_data ){
                data = a_data[node.key];
                // Update size if changed
                if ( node.key.startsWith("d/") && node.data.size != data.size ){
                    node.data.size = data.size;
                }

                util.refreshNodeTitle( node, data );
            }
        });

        a_parent.updateBtnState();*/
    });
    
    return this;
}