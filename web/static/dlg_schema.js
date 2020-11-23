import * as settings from "./settings.js";
import * as util from "./util.js";
import * as api from "./api.js";
import * as dialogs from "./dialogs.js";


export const mode_view = 0;
export const mode_edit = 1;
export const mode_new = 2;
export const mode_rev = 3;

const dlg_title = ["View","Edit","Create New","Create Revision of "];
const btn_title = ["Close","Save","Create","Create"];

export function show( a_mode, a_schema, a_cb ){
    var frame = $(document.createElement('div')),
        dlg_inst;

    frame.html(
        "<div id='dlg-tabs' style='height:100%;padding:0' class='tabs-no-header no-border'>\
            <ul>\
                <li><a href='#tab-dlg-gen'>General</a></li>\
                <li><a href='#tab-dlg-def'>Definition</a></li>\
                <li><a href='#tab-dlg-ref'>References</a></li>\
            </ul>\
            <div id='tab-dlg-gen' style='padding:0.5em 1em'>\
                <div class='col-flex' style='height:100%'>\
                    <div style='flex:none'><table style='width:100%'>\
                        <tr><td>ID: <span class='note'>*</span></td><td colspan='3'><input title='Schema ID' type='text' id='sch_id' maxlength='120' style='width:100%'></input></td></tr>\
                        <tr>\
                            <td>Version:</td><td><input type='text' title='Version number' id='sch_ver' style='width:95%'></input></td>\
                            <td>Uses:</td><td><input type='text' title='Number of records using this schema' id='sch_cnt' style='width:100%'></input></td>\
                        </tr>\
                        <tr><td>Owner:</td><td colspan='3'><input type='text' title='Owner name/ID' id='sch_own' style='width:100%'></input></td></tr>\
                        <tr><td>Access:</td><td colspan='3'>\
                            <input type='radio' id='sch_priv' name='sch_acc' value='private' checked/>\
                            <label for='sch_priv'>Private</label>&nbsp;&nbsp;\
                            <input type='radio' id='sch_pub' name='sch_acc' value='public'/>\
                            <label for='sch_pub'>Public</label>&nbsp;&nbsp;\
                            <input type='radio' id='sch_sys' name='sch_acc' value='system'/>\
                            <label for='sch_sys'>System</label>\
                        </td></tr>\
                    </table></div>\
                    <div style='flex:none;padding:1em 0 0.25em .2em'>Description: <span class='note'>*</span></div>\
                    <div style='flex:1 1 auto'>\
                        <textarea title='Description text (include keywords)' id='sch_desc' maxlength='2000' rows=8 style='width:100%;height:100%;box-sizing: border-box;'></textarea>\
                    </div>\
                </div>\
            </div>\
            <div id='tab-dlg-def' style='padding:.5em 1em'>\
                <div class='col-flex' style='height:100%'>\
                    <div style='flex:none;padding-bottom:0.25em'>\
                        Schema Definition (JSON): <span style='float:right'><a href='https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts' target='_blank'>editor help</a></span>\
                    </div>\
                    <div class='ui-widget ui-widget-content' style='flex:1 1 100%;padding:0'>\
                        <div id='sch_def' style='height:100%;width:100%'></div>\
                    </div>\
                </div>\
            </div>\
            <div id='tab-dlg-ref' style='padding:.5em 1em'>\
            </div>\
        </div>" );

        /*
        required uint32             ver         = 2;
        optional uint32             cnt         = 3;

        repeated SchemaData         uses        = 9;
        repeated SchemaData         used_by     = 10;
        */
    
    var jsoned = ace.edit( $("#sch_def",frame).get(0), {
        theme:(settings.theme=="light"?"ace/theme/light":"ace/theme/dark"),
        mode:"ace/mode/json",
        fontSize:16,
        autoScrollEditorIntoView:true,
        wrap:true
    });

    function handleSubmit( ok, reply ){
        if ( ok ){
            if ( a_cb ) a_cb();
            dlg_inst.dialog('close');
        }else{
            dialogs.dlgAlert( "Schema Update Error", reply );
        }
    }

    var dlg_opts = {
        title: dlg_title[a_mode] + " Schema",
        modal: true,
        width: 600,
        height: 500,
        resizable: true,
        resizeStop: function(ev,ui){
            $("#dlg-tabs",frame).tabs("refresh");
        },
        buttons:[],
        open: function(){
            dlg_inst = $(this);

            $(this).css('padding', '0');

            var widget = frame.dialog( "widget" );

            if ( a_mode != mode_view ){
                $(".ui-dialog-buttonpane",widget).append("<span class='note' style='padding:1em;line-height:200%'>* Required fields</span>");
            }

            $(".btn",frame).button();
            $("#dlg-tabs",frame).tabs({heightStyle:"fill"});

            if ( a_schema ){
                $("#sch_id",frame).val( a_schema.id );
                $("#sch_desc",frame).val( a_schema.desc );
                $("#sch_ver",frame).val( a_schema.ver );
                $("#sch_cnt",frame).val( "" + a_schema.cnt );

                if ( a_schema.ownNm ){
                    $("#sch_own",frame).val( a_schema.ownNm + " (" +a_schema.ownId.substr(2) + ")" );
                    if ( a_schema.pub ){
                        $("#sch_pub",frame).attr("checked", true);
                    }else{
                        $("#sch_priv",frame).attr("checked", true);
                    }
                }else{
                    $("#sch_own",frame).val( "System" );
                    $("#sch_sys",frame).attr("checked", true);

                }

                var def = JSON.parse( a_schema.def );
                jsoned.setValue( JSON.stringify( def, null, 4 ), -1);
            }else{
                $("#sch_ver",frame).val( 0 );
                $("#sch_cnt",frame).val( 0 );
                $("#sch_own",frame).val( settings.user.uid );
                jsoned.setValue( JSON.stringify({ "$schema": "_schema_id_","properties": {},"required": [],"type": "object"}, null,4),-1);
            }

            jsoned.resize();

            util.inputDisable( $("#sch_ver,#sch_cnt,#sch_own", frame ));

            if ( a_mode == mode_view ){
                util.inputDisable( $("#sch_id,#sch_desc", frame ));
                $(':radio:not(:checked)').attr('disabled', true);
                jsoned.setReadOnly(true);
                jsoned.container.style.opacity=0.45;
            }else if ( a_mode == mode_rev ){
                util.inputDisable( $("#sch_id", frame ));
            }

            if ( !settings.user.isAdmin ){
                console.log("disable sys acc");
                $("#sch_sys",frame).attr('disabled',true);
            }
        },
        close: function() {
            $(this).dialog("destroy").remove();
        }
    };

    if ( a_mode != mode_view ){
        dlg_opts.buttons.push({
            text: "Cancel",
            click: function() {
                $(this).dialog('close');
            }
        });
    }

    dlg_opts.buttons.push({
        id:"ok_btn",
        text: btn_title[a_mode],
        click: function(){
            if ( a_mode == mode_view ){
                dlg_inst.dialog('close');
                return;
            }
    
            var anno = jsoned.getSession().getAnnotations();

            if ( anno && anno.length ){
                dialogs.dlgAlert( "Schema Error", "Schema input has unresolved JSON syntax errors.");
                return;
            }
    
            var obj = {};

            obj.desc = $("#sch_desc",frame).val();

            var acc = $('input[name=sch_acc]:checked', frame ).val();
            console.log("sch acc",acc);
            if ( acc == "public"){
                obj.pub = true;
            }else if ( acc == "private"){
                obj.pub = false;
            }else{
                obj.pub = true;
                obj.sys = true;
            }

            obj.def = jsoned.getValue();

            if ( a_mode == mode_new ){
                obj.id = $("#sch_id",frame).val();
                console.log("new",obj);
                api.schemaCreate( obj, handleSubmit );
            }else if ( a_mode == mode_rev ){
                obj.id = a_schema.id;
                obj.ver = a_schema.ver;
                console.log("rev",obj);
                api.schemaRevise( obj, handleSubmit );
            }else{ // edit mode
                obj.id = a_schema.id;
                obj.ver = a_schema.ver;
                obj.idNew = $("#sch_id",frame).val();
                console.log("upd",obj);
                api.schemaUpdate( obj, handleSubmit );
            }
        }
    });

    util.inputTheme( $('input:text', frame ));
    util.inputTheme( $('textarea', frame ));

    frame.dialog( dlg_opts );
}
