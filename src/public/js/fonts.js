function loadModalInfo($scope, $http, user) {
	
	var user = user || getQueryParams().user;

	$scope.fonts = ["arial", "Palatino Linotype", "Book Antiqua"];

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

    $http.get("/getUsersDocuments?user="+user).success(function(reply) {
    	$scope.tabs = reply.map(function(r) { r.iframe = "/np?doc=" + r._id; return r; });
    });
    $http.get("/api/user/info?user="+user).success(function(reply) {
    	$scope.user = reply.user;
    });
    $http.get("/api/friends/get?user="+user).success(function(reply){
    	$scope.friends = reply;
    });
    $http.get("/api/user/colors/get?user="+user).success(function(reply){
    	$scope.numbers = reply.map(function(r) {
    		r.font = r.font || "Select A Font";
    		return r;
    	});
    });

    

    $('#myModal').on('hidden.bs.modal', function () {
	    console.log("hidden");
	    console.log($scope.numbers);

	    $http.post('/api/user/colors/update', {colors:$scope.numbers})
	    .then(
	    	function(response) {

	    	},
	    	function (err) {

	    	});
	});
}