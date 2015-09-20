function loadModalInfo($scope, $http, user) {
	
	var user = user || getQueryParams().user;

	$scope.fonts = ["Courier New", "Optima", "Book Antiqua", "Rockwell Extra Bold"];

	$scope.selectedFont = '';
	$scope.clicked = function(num, font) {

		console.log("clicked " + num + " " + font);

		$scope.numbers[num].font = font;
		$('#fontPicker-' + num).toggle();
	}

	$scope.showFonts = function(num) {
		$('#fontPicker-' + num).toggle();
		console.log($('#fontPicker-' + num)[0]);
	}


    $http.get("/api/user/colors/get?user="+user).success(function(reply){
    	$scope.numbers = reply.map(function(r) {
    		r.font = r.font || "Select A Font";
    		return r;
    	});
    });

    
    $scope.loadModal = function() {
    	console.log("modal", $('#myModal')[0]);
	    $('#myModal').on('hidden.bs.modal', function () {
		    console.log("hidden");
		    console.log($scope.numbers);

		    $http.post('/api/user/colors/update', {colors:$scope.numbers})
		    .then(
		    	function(response) {

		    	},
		    	function (err) {

		    	}
		    );
		});
	}

	$scope.loadModal();
}