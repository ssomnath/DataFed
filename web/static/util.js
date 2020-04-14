import * as settings from "./settings.js";

var status_timer;

export function inputTheme( a_objs ){
    a_objs.addClass("ui-widget ui-widget-content");
    return a_objs;
}

export function tooltipTheme( a_objs ){
    a_objs.tooltip({
        show: { effect: "fade", delay: 1000 },
        classes:{ "ui-tooltip": "note ui-corner-all tooltip-style" },
        position: {my: "left+15 top+15", at: "left bottom", collision: "flipfit" }
    });
}

export function inputDisable( a_objs ){
    a_objs.prop("disabled",true).removeClass("ui-widget-content").addClass("ui-state-disabled");
    return a_objs;
}

export function inputEnable( a_objs ){
    a_objs.prop("disabled",false).removeClass("ui-state-disabled").addClass("ui-widget-content");
    return a_objs;
}

// Examines input value to determine if an update has been made
// and if so, set the value in the updated object (only works for strings)
export function getUpdatedValue( a_new_val, a_old_obj, a_new_obj, a_field ){
    var tmp = a_new_val.trim(), old = a_old_obj[a_field];
    if (( old === undefined && tmp.length ) || ( old !== undefined && tmp != old ))
        a_new_obj[a_field] = tmp;
}

export function sizeToString( a_bytes ){
    if ( a_bytes == 0 )
        return "0";
    else if ( a_bytes < 1024 )
        return a_bytes + " B";
    else if ( a_bytes < 1048576 )
        return Math.floor( a_bytes / 102.4 )/10 + " KB";
    else if ( a_bytes < 1073741824 )
        return Math.floor( a_bytes / 104857.6 )/10 + " MB";
    else if ( a_bytes < 1099511627776 )
        return Math.floor( a_bytes / 107374182.4 )/10 + " GB";
    else
        return Math.floor( a_bytes / 109951162777.6 )/10 + " TB";
}

export function parseSize( a_size_str ){
    var result = null, val;
    var tokens = a_size_str.toUpperCase().trim().split(" ");

    for ( var i in tokens ){
        if ( tokens[i].length == 0 ){
            tokens.splice(i,1);
        }
    }

    if ( tokens.length == 2 ){
        val = parseFloat(tokens[0]);
        if ( !isNaN(val) ){
            switch(tokens[1]){
                case "PB": val *= 1024;
                /* falls through */
                case "TB": val *= 1024;
                /* falls through */
                case "GB": val *= 1024;
                /* falls through */
                case "MB": val *= 1024;
                /* falls through */
                case "KB": val *= 1024;
                /* falls through */
                case "B":
                    result = val;
                    break;
            }
        }
    }else if( tokens.length == 1 ){
        if ( tokens[0].endsWith("B")){
            var len = tokens[0].length;
            var numchar = "0123456789.";
            if ( numchar.indexOf( tokens[0][len-2] ) != -1 ){
                val = parseFloat( tokens[0].substr(0,len-1));
                if ( !isNaN(val))
                    result = val;
            }else{
                val = parseFloat( tokens[0].substr(0,len-2));
                if ( !isNaN(val) ){
                    switch(tokens[0][len-2]){
                        case "P": val *= 1024;
                        /* falls through */
                        case "T": val *= 1024;
                        /* falls through */
                        case "G": val *= 1024;
                        /* falls through */
                        case "M": val *= 1024;
                        /* falls through */
                        case "K": val *= 1024;
                            result = val;
                            break;
                    }
                }
            }
        }else{
            val = parseFloat( tokens[0] );
            if ( !isNaN(val) )
                result = val;
        }
    }
    if ( result != null )
        result = Math.ceil( result );
    return result;
}

var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

export function escapeHTML(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return escapeMap[s];
    });
}

export function checkDlgOpen( a_id ){
    var dlg = $( "#" + a_id.replace("/","_"));
    if ( dlg.length ){
        dlg.dialog( "moveToTop" );
        return true;
    }

    return false;
}

export function generateTitle( item, refresh ) {
    var title = "";

    if ( item.locked )
        title += "<i class='ui-icon ui-icon-locked'></i> ";

    title += "<span class='fancytree-title data-tree-title'>" + escapeHTML(item.title) + "</span>" + (refresh?"&nbsp<i class='browse-reload ui-icon ui-icon-reload'></i>":"") + "<span class='data-tree-subtitle'>";
    title += "<span class='data-tree-id'>" + item.id + "</span>";
    title += "<span class='data-tree-alias'>" + (item.alias?item.alias.substr(item.alias.lastIndexOf(":") + 1):"") + "</span>";

    // Only apply owner/creator labels to data records
    if ( item.id.startsWith( "d/" ) && item.owner && item.creator ){
        //console.log("item",item);
        var uid = "u/" + settings.user.uid;

        if ( item.owner.startsWith( "p/" )){
            if ( item.creator != uid )
                title += "&nbsp<span class='data-tree-creator'>[" + item.creator.substr(2) + "]</span>";
        }else{
            //if ( item.owner && item.creator ){
            if ( item.owner != uid && item.creator == uid )
                title += "&nbsp<span class='data-tree-creator-self'>(" + item.creator.substr(2) + ")</span>";
            else if ( item.owner == uid && item.creator != uid )
                title += "&nbsp<span class='data-tree-creator-other'>(" + item.creator.substr(2) + ")</span>";
            else if ( item.owner != uid && item.creator != uid )
                title += "&nbsp<span class='data-tree-owner-other'>[" + item.owner.substr(2) + "]</span>";

            /*}else if ( item.owner ){
                if ( item.owner != uid )
                    title += "&nbsp<span class='data-tree-owner'>(" + item.owner.substr(2) + ")</span>";
            }else if ( item.creator ){
                if ( item.creator != uid )
                    title += "&nbsp<span class='data-tree-creator'>[" + item.creator.substr(2) + "]</span>";
            }*/
        }
    }

    title += "</span>";

    return title;
}

export function buildObjSrcTree( obj, base, md_exp ){
    var src = [], k2, o, i, v, pod, val, len, vs, is_arr = Array.isArray( obj ), fkey, kbase;
    
    if (is_arr)
        kbase = (base?base:"") + "[";
    else
        kbase = base?base+".":"";

    Object.keys(obj).forEach(function(k) {
        k2 = escapeHTML(k);
        fkey=kbase + k + (is_arr?"]":"");

        if ( Array.isArray( obj[k] )){
            // Test for POD arrays (no objects) - If POD, put all values in title of this node; otherwise, add as children
            o = obj[k];
            pod = true;

            for ( i in o ){
                if ( typeof o[i] === 'object' || typeof o[i] === 'string' ){
                    pod = false;
                    break;
                }
            }

            if ( pod ){
                // Array of POD types - jam all on one line
                val = null;
                len = 0;

                for ( i in o ){
                    v = o[i];

                    if ( val ){
                        val += ",";
                    }else{
                        val = "[";
                    }

                    if ( typeof v === 'string' ){
                        vs = "\"" + escapeHTML( v ) + "\"";
                    }else{
                        vs = String(v);
                    }
                    len += vs.length;
                    if ( len > 100 ){
                        val += "<br>";
                        len = 0;
                    }
                    val += vs;
                }

                val += "]";
                src.push({key:fkey,title:k2 + " : " + val, icon: false });
                return;
            }
        }
        
        if ( typeof obj[k] === 'object' ){

            if ( md_exp ){
                if ( md_exp[fkey] ){
                    md_exp[fkey] = 10;
                }

                src.push({key:fkey,title:k2, icon: false, folder: true, expanded: md_exp[fkey]?true:false, children: buildObjSrcTree(obj[k],fkey,md_exp)});
            }else{
                src.push({key:fkey,title:k2, icon: false, folder: true, children: buildObjSrcTree(obj[k],fkey)});
            }
        }else if ( typeof obj[k] === 'string' ){
            src.push({key:fkey,title:k2 + " : \"" + escapeHTML( obj[k] ) + "\"", icon: false });
        }else if ( obj[k] === null ){
            src.push({key:fkey,title:k2 + " : null", icon: false });
        }else{
            src.push({key:fkey,title:k2 + " : " + String(obj[k]), icon: false });
        }
    });

    return src;
}

export function setStatusText( text, err ){
    if ( status_timer )
        clearTimeout( status_timer );

    var bar = $("#status_text");

    if ( err ){
        bar.addClass("blink-background");
        bar.html( "<span class='ui-icon ui-icon-alert' style='color:yellow;font-size:115%'></span>&nbsp" + text );
    }else{
        bar.removeClass("blink-background");
        bar.html( text);
    }

    status_timer = setTimeout( function(){
        status_timer = null;
        bar.html(" ");
        bar.removeClass("blink-background");
    },9000);
}