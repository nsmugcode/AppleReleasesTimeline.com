var life = {
	$title: document.getElementById('title'),
	$el: document.getElementById('life'),
	yearLength: 120, // 120px per year
	categories: [],
	reloading: false,
	start: function(){
		life.loadConfig(function(config){
			if (config.yearLength) life.yearLength = config.yearLength;

			life.fetch(function(response){
				var data = life.parse(response);
				var title = life.parseTitle(response);
				life.render(title, data);
			});
		});
	},
	loadConfig: function(fn){
		fetch('life.config.json')
		.then(response => response.json())
		.then(data => fn(data))
		.catch(error => console.log(error))			
	},
	// Load MD File of content
	fetch: function(fn){
		fetch('lifemd')
		.then(response => response.text())
		.then(data => fn(data))
		.catch(error => console.log(error))
	},
	parse: function(response){
		var list = response.match(/\-\s+[^\n\r]+/ig);
		var data = [];
		var selectedCategories = []
		// Check if category matches 
		let selectedCategoriesElements = document.querySelectorAll(".category-checkbox");
		if (selectedCategoriesElements != null){
			let categoryCheckboxes = document.querySelectorAll(".category-checkbox")
			categoryCheckboxes.forEach((element)=>{
				if (element.checked) {
					selectedCategories.push(element.value)
				}
			})
		}
		
		list.forEach(function(l){
			var matches = l.match(/\-\s+([\d\/\-\~]+)\s?(?:\[(.+)\])?\s(.+)?\s(\[.+\])?/i);
			var time = matches[1];
			var text = matches[3];
			var finalCategory = matches[2] ?? ""
			var eventURL = matches[4] ?? ""
			eventURL = eventURL.replace("[",'').replace("]",'');
			// Attempt to find text category
			if (selectedCategories.length > 0){
				if (selectedCategories.includes(finalCategory)) {
					data.push({
						time: life.parseTime(time),
						text: text,
						category: finalCategory,
						link: eventURL
					});
				}
			}else{
				data.push({
					time: life.parseTime(time),
					text: text,
					category: finalCategory,
					link: eventURL
				});
			}
			life.categories.push(finalCategory)
		});
		var uniqueCats = new Set(life.categories)
		life.categories = Array.from(uniqueCats);
		return data;
	},
	parseTitle: function(response){
		return response.match(/[^\r\n]+/i)[0];
	},
	parseTime: function(time, point){
		if (!point) point = 'start';
		var data = {};
		if (/^\~\d+$/.test(time)){ // ~YYYY
			data = {
				startYear: parseInt(time.slice(1), 10),
				estimate: true
			};
		} else if (/^\d+$/.test(time)){ // YYYY
			data[point + 'Year'] = parseInt(time, 10);
		} else if (/^\d+\/\d+$/.test(time)){ // MM/YYYY
			var t = time.split('/');
			data[point + 'Month'] = parseInt(t[0], 10);
			data[point + 'Year'] = parseInt(t[1], 10);
		} else if (/^\d+\/\d+\/\d+$/.test(time)){ // DD/MM/YYYY
			var t = time.split('/');
			data[point + 'Date'] = parseInt(t[0], 10);
			data[point + 'Month'] = parseInt(t[1], 10);
			data[point + 'Year'] = parseInt(t[2], 10);
		} else if (/\d\-/.test(time)){ // TIME-TIME
			var splitTime = time.split('-');
			var startTime = life.parseTime(splitTime[0]);
			var endTime = life.parseTime(splitTime[1], 'end');
			for (var k in startTime) { data[k] = startTime[k] }
			for (var k in endTime) { data[k] = endTime[k] }
		} else if (time == '~'){ // NOW
			var now = new Date();
			data.endYear = now.getFullYear();
			data.endMonth = now.getMonth()+1;
			data.endDate = now.getDate();
		}
		data.title = time;
		return data;
	},
	firstYear: null,
	renderEvent: function(d){
		var firstYear = life.firstYear;
		var yearLength = life.yearLength;
		var monthLength = yearLength/12;
		var dayLength = monthLength/30;

		var time = d.time;
		var estimate = time.estimate;
		var startYear = time.startYear;
		var startMonth = time.startMonth;
		var startDate = time.startDate;
		var endYear = time.endYear;
		var endMonth = time.endMonth;
		var endDate = time.endDate;
		var width = 0;

		// Calculate offset
		var startTime = new Date(firstYear, 0, 1);
		var endTime = new Date(startYear, startMonth ? startMonth-1 : 0, startDate || 1);
		var daysDiff = (endTime - startTime)/(24*60*60*1000);
		offset = daysDiff*dayLength;

		// Calculate width
		if (endYear){
			var _endMonth = endMonth ? endMonth-1 : 11;
			var _endDate = endDate || new Date(endYear, _endMonth+1, 0).getDate();
			startTime = new Date(startYear, startMonth ? startMonth-1 : 0, startDate || 1);
			endTime = new Date(endYear, _endMonth, _endDate);
			daysDiff = (endTime - startTime)/(24*60*60*1000);
			width = daysDiff*dayLength;
		} else {
			if (startDate){
				width = dayLength
			} else if (startMonth){
				width = monthLength;
			} else {
				width = yearLength;
			}
		}
		var categoryMarkup = ""
		var categoryIndex = 0
		if (d.category.length > 0){
			categoryMarkup = '<i class="event-category">'+d.category+'</i>'
			categoryIndex = life.categories.indexOf(d.category)
			console.log(categoryIndex);
		}
		var eventText = d.text
		if (d.link.length > 0){
			eventText = '<a href="'+d.link+'">'+eventText+'</a>'
		}
		
		return '<div class="event" style="margin-left: ' + offset.toFixed(2) + 'px"><div class="time time-category-'+categoryIndex+'" style="width: ' + width.toFixed(2) + 'px"></div><b>' + d.time.title + '</b> ' + eventText + '&nbsp;&nbsp;' + categoryMarkup + '</div>';
		return '';
	},
	render: function(title, data){
		document.title = title;
		life.$title.innerHTML = title;

		var firstYear = life.firstYear = data[0].time.startYear;
		var nowYear = new Date().getFullYear();
		var dayLength = life.yearLength/12/30;

		html = '';
		var days = 0;

		for (var y=firstYear, age = 0; y<=nowYear+1; y++, age++){
			html += '<section class="year" style="left: ' + (days*dayLength) + 'px">' + y + '</section>';
			days += (y % 4 == 0) ? 366 : 365;
		}
		data.forEach(function(d){
			html += life.renderEvent(d);
		});
		life.$el.innerHTML = html;
		// Generate Category List
		if (!life.reloading){
			let uniqueCategories = new Set(life.categories)
			var catDiv = document.getElementById('categories')
			catDiv.innerHTML = ""
			uniqueCategories.forEach((element) => {
				catDiv.innerHTML += "<input class='category-checkbox' type='checkbox' onchange='reloadCategories()' id='"+element+"' value='"+element+"' checked>"
				catDiv.innerHTML += "<label for='"+element+"'>"+element
			})
		}
	}
}

function reloadCategories(){
	life.reloading = true;
	life.start();
}

life.start();