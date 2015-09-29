'use strict';

var request = require('request'),
    vasync  = require('vasync'),
    config  = require('config');

var test = function (record, callback){
  return callback(null, {
    heading:      record.teaser.value[0].text,
    description:  record.body.value[0].text,
    image:        record.image.value.main,
    link:         record.button_link_a.value.url
  });
};

///--- Exports
exports.getNews = function (req, res, next) {
    request(config.news.url, function (error, response, data) {
      var entries = JSON.parse(data);
      vasync.forEachParallel({
        'func': test,
        'inputs': entries.results[0].data['template-aggregator']['posts-nsw'].value
      }, function(err, results){
          //Sets the cache-control header.
          res.cache();
          res.send(200, results.successes);
          next();
      });
    });
};
