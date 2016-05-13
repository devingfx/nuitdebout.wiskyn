InstaView.conf.paths.articles = '#';
MediaWikiJS.TAG_REG = /\{\{(.*?)\:(.*?)\}\}/g;
MediaWikiJS.METHOD = 'WIKI_PARSE';
// MediaWikiJS.METHOD = 'LOCAL_PARSE';
MediaWikiJS.models = {};
MediaWikiJS.prototype.getPage = function( path, cb )
{
	switch( MediaWikiJS.METHOD )
	{
		case 'WIKI_PARSE':
			wiki.getParsed( path, function( html )
			{
				if( html === false ) return false;
				
				var $html = $('<div class="container nd_wiki">').append( html );
				

				// $html.find('.mw-prefixindex-list-table');

				//Remove edit/editwikicode links on sections titles
				$html.find('.mw-editsection').remove();

				cb( $html )
			});
		break;

		case 'LOCAL_PARSE':
		
			wiki.getArticle( path, function( text )
			{
				if( text === false ) return false;
				
				var html = InstaView.convert( text )
							.replace(/<!--<(.*)>-->/g, '<$1>')
							.replace(/\{\{(.*?)\}\}/g, function( s, $1 )
							{ 
								var p = $1.split(/[|:/]/);
								console.log( s, $1, p[0], MediaWikiJS.models[p[0]] );
								if( MediaWikiJS.models[p[0]] )
									return MediaWikiJS.models[p[0]]($1);
								else
									return '';
							})

				
				
				var $html = $('<div class="container nd_wiki">').append( html );
				cb( $html )
			});
		break;
	}
}
MediaWikiJS.prototype.getParsed = function( path, cb )
{
	wiki.send({
		action: 'parse',
		page: path
	}, function( data )
	{
		if( data.missing || data.error ) return false;

		var text = data.parse.text["*"];

// 		text.replace(/^<!--<(.*)>-->$/, '<$1>');

// 		var $html = $('<div class="container nd_wiki">').append( text );
		// Replace @ image by the char
// 		$html.find('img[alt="@"]').before('@').remove();
		
		// $html.find('.mw-prefixindex-list-table');
		
		//Remove edit/editwikicode links on sections titles
// 		$html.find('.mw-editsection').remove();
		
		cb( text )
	});
}
MediaWikiJS.prototype.getArticle = function( path, cb )
{
	this.send({
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		titles: path
	},
	function (data)
	{
		var pages = data.query.pages,
			first = Object.keys(pages)[0],
			page = pages[first];
		console.groupCollapsed('Wiki article: ', path);
		console.log(page);

		
		if( !page.missing )
		{
			console.log( page.revisions[0]['*'] );
			console.groupEnd();
			cb( page.revisions[0]['*'] );
			// console.log('Last edited by: ' + page.revisions[0].user);
		}
		else {
			console.groupEnd();
			cb( false );
		}
	});
};
MediaWikiJS.prototype.getPageList = function( path, cb )
{
	this.send({
		action: 'query',
		list:'allpages', 
		apprefix: path
	},
	function (data)
	{
		var pages = data.query.allpages;
		console.log(pages);
		
		if( !data.error )
			cb( pages );
		else
			cb( false )
	});
};
MediaWikiJS.prototype.getPageBanner = function( wikiText )
{
	var bannerReg = /\{\{PAGEBANNER:(.*?)\|/,
		picture = bannerReg.exec( wikiText );
	
	if( picture )
	{
		console.log( 'File:' + picture[1] );
		wiki.getImagesInfo( 'File:' + picture[1], $('.nd_header__img').height(), function(data)
		{
			console.log('imgInfo:', data);
			$('.nd_header__img').css({
				backgroundImage: 'url("'+data[0].thumburl+'")'
			})

		})
	}
};
MediaWikiJS.prototype.getImagesInfo = function( name, height, cb )
{
  	var req = {
  			action: 'query',
  			prop: 'imageinfo',
  			iiprop: 'url|size',
  			iiurlheight: height,
  			titles: name
  		};
  	if( typeof height == 'function' )
  	{
  		delete req.iiurlwidth;
  		cb = height;
  		height = null;
  	}
  	this.send(req, function (data)
  	{
		    var pages = data.query.pages;
		    for(var n in pages);
		    var infos = pages[n].imageinfo;
		    // console.log( width ? infos.thumburl : infos.url );
		    cb( infos );
	});
  };
MediaWikiJS.prototype.getMainImageLink = function( $html )
{
	$html.find('a').each( function()
		{
			var hash = this.href.split('#').pop();
			if( /^(File|Fichier)/.exec(hash) )
			{
				$(this).remove();
				wiki.getImagesInfo( hash, $('.nd_header__img').height(), function(data)
				{
					console.log('imgInfo:', data);
					$('.nd_header__img').css({
						backgroundImage: 'url("'+data[0].thumburl+'")'
					})
					
				})
			}
		});
};
MediaWikiJS.prototype._transformLinks = function( $html )
{
	var search = new RegExp('\/wiki\/' + wiki.rootArticle.join('/')+'\/?');
	// Transform all links to be a hash: #wiki/path/to/article
	// starting from rootArticle
	$html.find('a').each( function()
	{
		var href = this.getAttribute('href');
		if( !/^http/.test(href) && search.test(href) )
			this.href = decodeURIComponent('#' + href
													.replace( search, '' )
													.replace(/\/index\.php\?title=(.*?)&redirect.*/, '$1')
						);
		else {
			this.target = '_blank';
		}
		
	});
	$html.find('img').each( function(i,o)
	{
		this.src = 'https://wiki.nuitdebout.fr/' + this.getAttribute('src');
	});
};
MediaWikiJS.prototype.updateMenus = function( _$toc )
{
// 	$('#nav-mobile, #nav-desktop').empty();
	$('#nav-mobile').empty();
	_$toc.find('.tocnumber').remove();
	window.$toc = _$toc
					.find('ul > li.toclevel-1')
					.appendTo('#nav-mobile')
// 					.clone()
// 						.appendTo('#nav-desktop')
// 			.find('a').click(function()
// 			{
// 				console.log($($(this).attr('href')));
// 				return false;
// 			})
		;
	
};
MediaWikiJS.prototype.updateTitle = function( page, ville )
{
	page = page && page.replace(/[_]/g, ' ');
	ville = ville && ville.replace(/[_]/g, ' ');
	document.title = "NuitDebout " + ville;
	var first = page && /^[^\s]*/.exec(page)[0];
	$('.navbar__logo .town, .nd_header__brand .town').text( ville || '' );
	$('.navbar__logo .page').text( first || '' );
};
MediaWikiJS.prototype.navigateToCurrentHash = function( e )
{
	var scrollHistory = this.scrollHistory = this.scrollHistory || {},
		hash = document.location.hash,
		path = wiki.rootArticle.concat( hash.replace('#','').split('/') ),
		path = path.filter(function(s){return s != ''}),
		ville = path[0] == 'Villes' && path[1],
		page = path.length > 2 && path[path.length-1] || '';
	console.log('wiki page:', path );
	console.log('ville:', ville );
	console.log('e:', e );
	
	if( e ) scrollHistory[e.oldURL] = window.scrollY;

	wiki.getPage( path.join('/'), function( $html )
	{
		if( $html === false )
		{
// 			$('.error404').show()
			return false;
		}
		else
		{
			wiki._transformLinks( $html );
			wiki.updateTitle( page, ville );
			wiki.updateMenus( $html.find('#toc').remove() );

			wiki.getArticle( path.join('/'), function( text )
			{
				// Find the top town picture
				if( ville && !page )
// 					wiki.getMainImageLink( $html );
					wiki.getPageBanner( text );

			});

			page && $('.nd_header, #header').hide();
			!page && $('.nd_header, #header').show();

			

			// Remove inputbox and tips
			$html.find('.mw-inputbox-centered')
				.parent()
				.each( function(){ $(this.nextElementSibling).remove() } )
				.remove()

			
			// Show in document
			$('#wiki').html( $html );

			smoothTo( e && scrollHistory[e.newURL] || 0 );
		}
	})
};



MediaWikiJS.models.Facebook = function( params )
{
	params = params.split('|')[1].split(' ');
	return '<span class="facebook">\
				<img src="/images/thumb/c/c2/F_icon.svg/16px-F_icon.svg.png" \
				width="16" height="16" \
				srcset="/images/thumb/c/c2/F_icon.svg/24px-F_icon.svg.png 1.5x, /images/thumb/c/c2/F_icon.svg/32px-F_icon.svg.png 2x">\
				&nbsp;<a rel="nofollow" class="external text" href="'+params.shift()+'" target="_blank">'+params.join(' ')+'</a>\
				</span>';
}
MediaWikiJS.models.PAGEBANNER = function( params )
{
	return '';
}
MediaWikiJS.models['@'] = function( params )
{
	return '@';
}
MediaWikiJS.models.Twitter = function( params )
{
	params = params.split('|')[1].split(' ');
	return '<span class="twitter">\
				<img alt="Twitter.svg" src="/images/thumb/d/db/Twitter.svg/16px-Twitter.svg.png" width="16" height="13" srcset="/images/thumb/d/db/Twitter.svg/24px-Twitter.svg.png 1.5x, /images/thumb/d/db/Twitter.svg/32px-Twitter.svg.png 2x">&nbsp;\
				<a rel="nofollow" class="external text" href="https://twitter.com/'+params[0]+'" target="_blank">@'+params[0]+'</a>\
			</span>';
}
MediaWikiJS.models.chat2 = function( params )
{
	params = params.split('|');
	var type = params[0].split('/')[1] || 'channel';
	params = params[1].split(' ');
	return '<span class="rocket">\
				<img alt="RocketChat Logo 1024x1024.png" src="/images/thumb/5/55/RocketChat_Logo_1024x1024.png/16px-RocketChat_Logo_1024x1024.png" width="16" height="16" srcset="/images/thumb/5/55/RocketChat_Logo_1024x1024.png/24px-RocketChat_Logo_1024x1024.png 1.5x, /images/thumb/5/55/RocketChat_Logo_1024x1024.png/32px-RocketChat_Logo_1024x1024.png 2x">&nbsp;\
				<a rel="nofollow" class="external text" href="https://chat.nuitdebout.fr/'+type+'/'+params[0]+'" target="_blank">#'+params[0]+'</a>\
			</span>';
}
MediaWikiJS.models.Special = function( params )
{
	return '';
}