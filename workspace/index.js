// IMPAC! WORKSPACE
//--------------------------------------------------------
// PLEASE DO NOT COMMIT CHANGES TO THIS FILE.
// You can use `git add -p ./` to selectively add files to your git index.
// -------------------------------------------------------
var module = angular.module('impacWorkspace', ['maestrano.impac', 'toastr']);

// -------------------------------------------------------
// Impac Workspace Settings
// -------------------------------------------------------
// Provide important configurations for the impacWorkspace.
module.factory('settings', function () {
  return {
    // Credentials and endpoints
    mno_url: 'https://get-uat.maestrano.io',
    impac_url: 'https://api-impac-uat.maestrano.io',
    api_key: '',
    api_secret: '',
    org_uid: '', // First organisations if unspecified

    // -----------------------------------------------
    // Kpis configurations
    // -----------------------------------------------
    // Change this to `true` to force kpi's to allow multiple watchables, instead of
    // using the mno_hub kpis#discover action maps kpis to have single watchables per kpi.
    multiple_watchables_mode: false,
    // Stub widget templates - add new widgets!
    //------------------------------------------------
    // Widget templates are stored on Maestrano API, stub your
    // new widget templates here, and contact us for permenant additions or
    // changes to existing widget templates.
    widgetsTemplates: [
      // Example widget template, please see documentation "How-To: Create a Widget" for available
      // options, and importantly, note how the path & metadata.template attributes work.
      // --
      // {
      //   path: 'accounts/assets_summary',
      //   name: 'Assets / Liabilities summary',
      //   metadata: { template: 'accounts/assets_liability_summary' },
      //   desc: 'Compare Assets and Liabilities accounts',
      //   icon: 'pie-chart',
      //   width: 3
      // },
    ]
    // --
  };
});

//--------------------------------------------------------
// Do not edit below unless you know what you're doing.
//--------------------------------------------------------

// HTTP Interceptor
//--------------------------------------------------------
// Applies headers / configurations to certain requests.
module.factory('domainSpecificAuthorization', function($window, settings){
  return {
    request: function(config) {
      // encodes a base64 string - Basic Authentication.
      var credentials = $window.btoa(settings.api_key + ':' + settings.api_secret);
      var url = config.url;
      // merges basic auth with headers if url is to Maestrano's ecosystem.
      if (url.indexOf(settings.mno_url) >= 0 || url.indexOf(settings.impac_url) >= 0) {
        angular.extend(config.headers, { Authorization: 'Basic ' + credentials });
      }
      return config;
    }
  };
});
module.config(function ($httpProvider) {
  $httpProvider.interceptors.push('domainSpecificAuthorization');
});
// --
// Impac! Angular Provider configurations
// -------------------------------------------------------
module.run(function ($log, $q, $http, ImpacLinking, ImpacAssets, ImpacRoutes, ImpacTheming, ImpacDeveloper, settings, toastr) {

  // Check credentials have been provided
  if (!settings.api_key || !settings.api_secret) {
    fail('Missing authentication credentials!');
  }

  // Configure the ImpacRoutes service options.
  var routesConfig = {
    mnoHub: settings.mno_url + '/api/v2',
    impacPrefix: '/impac',
    impacApi: settings.impac_url + '/api',
    kpis: {
      index: settings.mno_url + '/api/v2/impac/kpis'
    }
  };
  if (settings.multiple_watchables_mode) { delete routesConfig.kpis; }
  ImpacRoutes.configureRoutes(routesConfig);

  // Configure the ImpacTheming service options.
  ImpacTheming.configure({
    dhbKpisConfig: {
      enableKpis: true
    },
    alertsConfig: {
      enableAlerts: true
    },
    dhbConfig: {
      showDhbHeading: true,
      dhbHeadingText: 'Your business at a glance, in real-time'
    },
    dhbSelectorConfig: {
      selectorType: 'dropdown',
      pdfModeEnabled: true
    },
    dhbSettings: {
      syncApps: {
        show: function() { return false; }
      }
    }
  });

  // Link Impac! Assets
  ImpacAssets.configure({
    defaultImagesPath: '/dist/images',
  })

  // Configure the ImpacDeveloper service options.
  ImpacDeveloper.configure({
    status: true,
    widgetsTemplates: settings.widgetsTemplates || []
  });

  // Link core callbacks required for impac-angular lib to run.
  ImpacLinking.linkData({
    organizations: function () {
      return getOrganizations(settings.org_uid);
    },
    user: function () {
      return getUser();
    },
    pusher_key: 'e98dfd8e4a359a7faf48' // Maestrano pusher account key.
  });

  function getOrganizations(orgUid) {
    var deferred = $q.defer();
    getUserData().then(function (user) {
      var orgs = (user.organizations || []);
      var orga = orgs.find(function(orga) { return orga.uid == orgUid });
      var orgId = (orga && orga.id) || orgs[0].id || null;

      deferred.resolve({ organizations: orgs, currentOrgId: orgId });
    }, function (err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function getUser() {
    var deferred = $q.defer();
    getUserData().then(function (user) {
      deferred.resolve(user);
    }, function (err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function getUserData() {
    return $http.get(settings.mno_url + '/api/v2/current_user')
      .then(function (response) {
        return response.data;
      }, function () {
        var msg = 'Unable to retrieve Organizations';
        fail(msg);
        return $q.reject(msg);
      });
  }

  function fail(msg) {
    $log.error('workspace/index.js Error: ' + msg);
    toastr.error(msg, 'Error');
  }

});
