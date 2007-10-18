if(typeof SiteTreeHandlers == 'undefined') SiteTreeHandlers = {};
SiteTreeHandlers.showNLDraft_url = 'admin/newsletter/shownewsletter/';
SiteTreeHandlers.showNLType_url = 'admin/newsletter/showtype/';
SiteTreeHandlers.controller_url = 'admin/newsletter';

SiteTree.prototype = {
	castAsTreeNode: function(li) {
		behaveAs(li, SiteTreeNode, this.options);
	},
	
	getIdxOf : function(treeNode) {
		if(treeNode && treeNode.id)
			return treeNode.id;
	},
	
	getTreeNodeByIdx : function(idx) {
		if(!idx) idx = "0";
		return document.getElementById(idx);
	},
	
	initialise: function() {
		this.observeMethod('SelectionChanged', this.changeCurrentTo);	
	},
	
	createTreeNode : function(idx, title, pageType, secondIdx) {
		var i;
		var node = document.createElement('li');
		node.className = pageType;
		
		var aTag = document.createElement('a');
		
		node.id = idx;
		
		if( pageType == 'Draft' ) {
			aTag.href = SiteTreeHandlers.showNLDraft_url + idx;
		} else {
			aTag.href = SiteTreeHandlers.showNLType_url + idx;	
		}
		
		aTag.innerHTML = title;
		node.appendChild(aTag);

		SiteTreeNode.create(node, this.options);
		
		return node;
	},
	
	addDraftNode: function( title, parentID, draftID ) {
		var draftNode = this.createTreeNode( 'draft_' + parentID + '_' + draftID, title, 'Draft', parentID );
		this.getTreeNodeByIdx('drafts_' + parentID).appendTreeNode( draftNode );
		this.changeCurrentTo( draftNode );
	},
	
	addTypeNode: function( title, parentID ) {
		var typeNode = this.createTreeNode( 'mailtype_' + parentID, title, 'MailType' );
		var draftsNode = this.createTreeNode( 'drafts_' + parentID, 'Drafts', 'DraftFolder' );
		var sentItemsNode = this.createTreeNode( 'sent_' + parentID, 'Sent Items', 'SentFolder' );
		var mailingListNode = this.createTreeNode( 'recipients_' + parentID, 'Mailing List', 'Recipients' );
		typeNode.appendTreeNode( draftsNode );
		Element.addClassName( draftsNode, 'nodelete');
		typeNode.appendTreeNode( sentItemsNode );
		Element.addClassName(sentItemsNode,'nodelete');
		typeNode.appendTreeNode( mailingListNode );
		Element.addClassName(mailingListNode,'nodelete');
		this.appendTreeNode( typeNode );	
		this.changeCurrentTo( typeNode );
	}
}


/**
 * Delete pages action
 */
deletedraft = {
	button_onclick : function() {
		if(treeactions.toggleSelection(this)) {
			deletedraft.o1 = $('sitetree').observeMethod('SelectionChanged', deletedraft.treeSelectionChanged);
			deletedraft.o2 = $('deletedrafts_options').observeMethod('Close', deletedraft.popupClosed);
			addClass($('sitetree'),'multiselect');

			var sel = $('sitetree').firstSelected();
			
			if(sel) {
				var selIdx = $('sitetree').getIdxOf(sel);
				deletedraft.selectedNodes = { };
				deletedraft.selectedNodes[selIdx] = true;
				sel.removeNodeClass('current');
				sel.addNodeClass('selected');	
			}	
		}
		return false;
	},

	treeSelectionChanged : function(selectedNode) {
		var idx = $('sitetree').getIdxOf(selectedNode);

		if(selectedNode.selected) {
			selectedNode.removeNodeClass('selected');
			selectedNode.selected = false;
			deletedraft.selectedNodes[idx] = false;

		} else {
			selectedNode.addNodeClass('selected');
			selectedNode.selected = true;
			deletedraft.selectedNodes[idx] = true;
		}
		
		return false;
	},
	
	popupClosed : function() {
		removeClass($('sitetree'),'multiselect');
		$('sitetree').stopObserving(deletedraft.o1);
		$('deletedrafts_options').stopObserving(deletedraft.o2);

		for(var idx in deletedraft.selectedNodes) {
			if(deletedraft.selectedNodes[idx]) {
				node = $('sitetree').getTreeNodeByIdx(idx);
				if(node) {
					node.removeNodeClass('selected');
					node.selected = false;
				}
			}
		}
	},

	form_submit : function() {
		var csvIDs = "";
		for(var idx in deletedraft.selectedNodes) {
			if(deletedraft.selectedNodes[idx]) csvIDs += (csvIDs ? "," : "") + idx;
		}
		
		if(csvIDs) {
			$('deletedrafts_options').elements.csvIDs.value = csvIDs;

			Ajax.SubmitForm('deletedrafts_options', null, {
				onSuccess : function(response) {
					Ajax.Evaluator(response);

					var sel;
					if((sel = $('sitetree').selected) && sel.parentNode) sel.addNodeClass('current');
//					else $('Form_EditForm').innerHTML = "";

					treeactions.closeSelection($('deletedrafts'));
				},
				onFailure : function(response) {
					errorMessage('Error deleting drafts', response);
				}
			});

			$('deletedrafts').getElementsByTagName('a')[0].onclick();
			
		} else {
			alert("Please select at least 1 page.");
		}

		return false;
	},
	
	treeSelectionChanged : function(selectedNode) {
		var idx = $('sitetree').getIdxOf(selectedNode);

		if( !deletedraft.selectedNodes )
			deletedraft.selectedNodes = {};

		if(selectedNode.className.indexOf('nodelete') == -1) {
			if(selectedNode.selected) {
				selectedNode.removeNodeClass('selected');
				selectedNode.selected = false;
				deletedraft.selectedNodes[idx] = false;
	
			} else {
				selectedNode.addNodeClass('selected');
				selectedNode.selected = true;
				deletedraft.selectedNodes[idx] = true;
			}
		}
		
		return false;
	}
}

SiteTreeNode.prototype.onselect = function() {
	$('sitetree').changeCurrentTo(this);
	if($('sitetree').notify('SelectionChanged', this)) {
		if(typeof save != 'undefined'){
			autoSave(true, this.getPageFromServer.bind(this));
		}
		else {
			this.getPageFromServer();
		}
	}
	return false; 
};

SiteTreeNode.prototype.getPageFromServer = function() {

    var match = this.id.match(/(mailtype|drafts|draft|sent|recipients)_([\d]+)$/);
    var openTabName = null;
    var currentPageID = null;
   	
   	if( $('Form_EditForm_ID') )
   		currentPageID = $('Form_EditForm_ID').value;
   	
    var newPageID = null;
    var otherID = null;
    var type = null;
    
    var forceReload = $('Form_EditForm_Type') && $('Form_EditForm_Type').value == 'Newsletter';
        
		if( match ) {
            
      // open the appropriate tab
      switch( match[1] ) {
          case 'recipients':
              openTabName = 'Root_Recipients_set_Recipients';
              break;
          case 'drafts':
              openTabName = 'Root_Drafts';
              break;
          case 'sent':
              openTabName = 'Root_Sent_set_Sent';
              break;    
      }
      
      newPageID = match[2];
      type = match[1];
		} else if(this.id.match(/(mailtype|drafts|draft|sent|recipients)_([\d]+)_([\d]+)$/)) {
			newPageID = RegExp.$2;
			type = RegExp.$1;
			otherID = RegExp.$3;
			forceReload = true;
		}
		
		if(	forceReload || currentPageID != newPageID )
			$('Form_EditForm').getPageFromServer(newPageID, type, otherID, openTabName);
		else
			openTab( openTabName );
};

function draft_sent_ok( newsletterID, draftID ) {
    var draftsListNode = $('drafts_' + newsletterID);
    var sentListNode = $('sent_' + newsletterID);
    var draftNode = $('draft_' + newsletterID + '_' + draftID );
    
    draftsListNode.removeTreeNode( draftNode );
    draftNode.id = 'sent_' + newsletterID + '_' + draftID;
    sentListNode.appendTreeNode( draftNode, null );
    statusMessage('Sent email to mailing list', 'good'); 
}

function resent_ok( newsletterID, sentID ) {
    statusMessage('Resent email to mailing list', 'good'); 
}

function reloadSiteTree() {
	
	new Ajax.Request( 'admin/newsletter/getsitetree', {
		method: get,
		onSuccess: function( response ) {
			$('sitetree_holder').innerHTML = response.responseText;
		},
		onFailure: function( response ) {
				
		}	
	});
		
}

_HANDLER_FORMS['addtype'] = 'addtype_options';
_HANDLER_FORMS['deletedrafts'] = 'deletedrafts_options';

AddForm = Class.extend('addpage');
AddForm.applyTo('#addtype');
AddForm.prototype = {
  initialize: function () {
		Observable.applyTo($(_HANDLER_FORMS[this.id]));
		this.getElementsByTagName('a')[0].onclick = returnFalse;
		$(_HANDLER_FORMS[this.id]).onsubmit = this.form_submit;
	},
    
  form_submit : function() {
		var st = $('sitetree');
		
		if( st.selected.length )
			selectedNode = st.selected[0];
		else
			selectedNode = st.selected;
        
    var parentID = null;
    
    while( selectedNode && !parentID ) {
        if( selectedNode && selectedNode.id && selectedNode.id.match(/mailtype_([0-9a-z\-]+)$/) )
            parentID = RegExp.$1;
        else
            selectedNode = selectedNode.parentNode;
    }
        
		if(parentID && parentID.substr(0,3) == 'new') {
			alert("You have to save a page before adding children underneath it");
			
		} else {
			
			this.elements.ParentID.value = parentID;

      var type = 'draft';
      var selectIDPrefix = 'draft_' + parentID + '_';
      
      if( $('add_type').value == 'type' ) {
          type = 'type';
          selectIDPrefix = 'mailtype_';
      }
            
			var request = new Ajax.Request( this.action + '?ajax=1&PageType=' + type + '&ParentID=' + parentID, {
        method: 'get',
        asynchronous: true,
				onSuccess : function( response ) {
         
          $('Form_EditForm').loadNewPage(response.responseText);
          	
          // create a new node and add it to the site tree
          if( type == 'draft' ) {
          	$('sitetree').addDraftNode('New draft newsletter', parentID, $('Form_EditForm_ID').value );
          } else {
          	$('sitetree').addTypeNode('New newsletter type', $('Form_EditForm_ID').value ); 
          }
          	
          statusMessage('Added new ' + type);
        },
     
				onFailure : function(response) {
					alert(response.responseText);
          statusMessage('Could not add new ' + type );
        }
			});
		}
		
		return false;
	},
    
  reloadSiteTree: function( response ) {
    statusMessage('Added new newsletter type', 'good' );
    $('sitetree_holder').innerHTML = response.responseText;
    Behaviour.apply( $('sitetree_holder') );
  },
    
  button_onclick : function() {
		if(treeactions.toggleSelection(this)) {
			var selectedNode = $('sitetree').firstSelected();
			if(selectedNode) {
				while(selectedNode.parentTreeNode && !selectedNode.hints.defaultChild) {
					$('sitetree').changeCurrentTo(selectedNode.parentTreeNode);
					selectedNode = selectedNode.parentTreeNode;
				}
			}
						
			this.o1 = $('sitetree').observeMethod('SelectionChanged', this.treeSelectionChanged.bind(this));
			this.o2 = $(_HANDLER_FORMS[this.id]).observeMethod('Close', this.popupClosed.bind(this));
		}
		return false;
	},

  treeSelectionChanged: function( treeNode ) {
    this.selected = treeNode;
  },
  
  popupClosed: function() {
  	$('sitetree').stopObserving(this.o1);
  	$(_HANDLER_FORMS.addtype).stopObserving(this.o2);
  }
}

function removeTreeNodeByIdx( tree, nodeID ) {
	var node = tree.getTreeNodeByIdx( nodeID );
	if( node )
		if( node.parentTreeNode )
			node.parentTreeNode.removeTreeNode( node );
		else
			$('sitetree').removeTreeNode( node );
}

/** 
 * Initialisation function to set everything up
 */
Behaviour.addLoader(function () {
	// Set up add draft
	Observable.applyTo($('addtype_options'));
    
    if( $('addtype') ) {
    	if( AddForm.button_click )
	    $('addtype').getElementsByTagName('a')[0].onclick = function() {return false;};
	    if( AddForm.button_click )
	    	$('addtype_options').onsubmit = AddForm.form_submit;
	}
	// Set up delete drafts
	Observable.applyTo($('deletedrafts_options'));
    
    var deleteDrafts = $('deletedrafts');
    
    if( deleteDrafts ) {
	    deleteDrafts.onclick = deletedraft.button_onclick;
	    deleteDrafts.getElementsByTagName('a')[0].onclick = function() {return false;};
	    $('deletedrafts_options').onsubmit = deletedraft.form_submit;
    }
});