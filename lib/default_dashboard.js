'use strict';

var dashboards = {};

dashboards.defaultDashboard = JSON.stringify({
  "attributes": {
    "title": "dashboard_DEFAULT_DASHBOARD_ID",
    "hits": 0,
    "description": "",
    "panelsJSON": "[{\"col\":1,\"id\":\"AWPPYAb5jksh56B4lYqn_DEFAULT_DASHBOARD_ID\",\"panelIndex\":2,\"row\":17,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX91bjksh56B4lYql_DEFAULT_DASHBOARD_ID\",\"panelIndex\":3,\"row\":42,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX_TKjksh56B4lYqm_DEFAULT_DASHBOARD_ID\",\"panelIndex\":4,\"row\":51,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX8rFjksh56B4lYqk_DEFAULT_DASHBOARD_ID\",\"panelIndex\":5,\"row\":38,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"AWPPX7mEjksh56B4lYqj_DEFAULT_DASHBOARD_ID\",\"panelIndex\":6,\"row\":38,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX6Ocjksh56B4lYqi_DEFAULT_DASHBOARD_ID\",\"panelIndex\":7,\"row\":31,\"size_x\":12,\"size_y\":7,\"type\":\"visualization\"},{\"col\":7,\"id\":\"AWPPX1fGjksh56B4lYqd_DEFAULT_DASHBOARD_ID\",\"panelIndex\":8,\"row\":6,\"size_x\":6,\"size_y\":3,\"type\":\"visualization\"},{\"col\":3,\"id\":\"AWPPXxiQjksh56B4lYqb_DEFAULT_DASHBOARD_ID\",\"panelIndex\":9,\"row\":22,\"size_x\":10,\"size_y\":2,\"type\":\"visualization\"},{\"col\":4,\"id\":\"AWPPXy98jksh56B4lYqc_DEFAULT_DASHBOARD_ID\",\"panelIndex\":10,\"row\":6,\"size_x\":3,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPXqhGjksh56B4lYqW_DEFAULT_DASHBOARD_ID\",\"panelIndex\":11,\"row\":1,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX2sWjksh56B4lYqe_DEFAULT_DASHBOARD_ID\",\"panelIndex\":12,\"row\":20,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPXuhnjksh56B4lYqZ_DEFAULT_DASHBOARD_ID\",\"panelIndex\":13,\"row\":11,\"size_x\":2,\"size_y\":6,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX5Iqjksh56B4lYqh_DEFAULT_DASHBOARD_ID\",\"panelIndex\":14,\"row\":29,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"col\":3,\"id\":\"AWPPXtS6jksh56B4lYqY_DEFAULT_DASHBOARD_ID\",\"panelIndex\":15,\"row\":24,\"size_x\":10,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPXwFnjksh56B4lYqa_DEFAULT_DASHBOARD_ID\",\"panelIndex\":16,\"row\":22,\"size_x\":2,\"size_y\":7,\"type\":\"visualization\"},{\"col\":3,\"id\":\"AWPPXrmGjksh56B4lYqX_DEFAULT_DASHBOARD_ID\",\"panelIndex\":17,\"row\":11,\"size_x\":10,\"size_y\":6,\"type\":\"visualization\"},{\"col\":1,\"id\":\"heatmap_DEFAULT_DASHBOARD_ID\",\"panelIndex\":18,\"row\":44,\"size_x\":12,\"size_y\":7,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPX4Hvjksh56B4lYqf_DEFAULT_DASHBOARD_ID\",\"panelIndex\":19,\"row\":9,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWPPXo1gjksh56B4lYqV_DEFAULT_DASHBOARD_ID\",\"panelIndex\":20,\"row\":6,\"size_x\":3,\"size_y\":3,\"type\":\"visualization\"}]",
    "optionsJSON": "{\"darkTheme\":false}",
    "uiStateJSON": "{\"P-10\":{\"vis\":{\"legendOpen\":false}},\"P-11\":{\"vis\":{\"legendOpen\":false,\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}},\"P-12\":{\"vis\":{\"legendOpen\":false}},\"P-13\":{\"vis\":{\"legendOpen\":false}},\"P-14\":{\"vis\":{\"legendOpen\":false}},\"P-15\":{\"vis\":{\"legendOpen\":false}},\"P-16\":{\"vis\":{\"legendOpen\":false,\"defaultColors\":{\"0 - 0.5\":\"rgb(165,0,38)\",\"0.5 - 0.6\":\"rgb(244,109,67)\",\"0.6 - 0.7\":\"rgb(254,224,139)\",\"0.7 - 0.8\":\"rgb(217,239,139)\",\"0.8 - 0.9\":\"rgb(102,189,99)\",\"0.9 - 1\":\"rgb(0,104,55)\"}}},\"P-17\":{\"vis\":{\"legendOpen\":false}},\"P-18\":{\"vis\":{\"legendOpen\":false}},\"P-19\":{\"vis\":{\"legendOpen\":false}},\"P-2\":{\"vis\":{\"legendOpen\":false}},\"P-20\":{\"vis\":{\"legendOpen\":false,\"defaultColors\":{\"0 - 100\":\"rgb(0,104,55)\"}}},\"P-3\":{\"vis\":{\"legendOpen\":false}},\"P-4\":{\"vis\":{\"legendOpen\":false}},\"P-5\":{\"vis\":{\"legendOpen\":false}},\"P-6\":{\"vis\":{\"legendOpen\":false}},\"P-7\":{\"vis\":{\"legendOpen\":false}},\"P-8\":{\"vis\":{\"legendOpen\":false}},\"P-9\":{\"vis\":{\"legendOpen\":false}}}",
    "version": 1,
    "timeRestore": true,
    "timeTo": "now",
    "timeFrom": "now-7d",
    "refreshInterval": {
      "display": "5 seconds",
      "pause": false,
      "section": 1,
      "value": 5000
    },
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}],\"highlightAll\":true,\"version\":true}"
    }
  }
});

dashboards.formalzDashboard = JSON.stringify({
  "attributes": {
    "title": "dashboard_DEFAULT_DASHBOARD_ID",
    "hits": 0,
    "description": "",
    "panelsJSON": "[{\"col\":3,\"id\":\"TimePicker_DEFAULT_DASHBOARD_ID\",\"panelIndex\":13,\"row\":1,\"size_x\":10,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"TotalSessionPlayers-Cmn_DEFAULT_DASHBOARD_ID\",\"panelIndex\":2,\"row\":1,\"size_x\":2,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWn9B35AAztPIDR8zmfT_DEFAULT_DASHBOARD_ID\",\"panelIndex\":4,\"row\":6,\"size_x\":4,\"size_y\":3,\"type\":\"visualization\"},{\"col\":5,\"id\":\"AWn9B54eAztPIDR8zmfU_DEFAULT_DASHBOARD_ID\",\"panelIndex\":5,\"row\":6,\"size_x\":4,\"size_y\":3,\"type\":\"visualization\"},{\"col\":9,\"id\":\"AWn9B7kXAztPIDR8zmfV_DEFAULT_DASHBOARD_ID\",\"panelIndex\":6,\"row\":6,\"size_x\":4,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWn9B9qoAztPIDR8zmfW_DEFAULT_DASHBOARD_ID\",\"panelIndex\":7,\"row\":9,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"AWn9CAtHAztPIDR8zmfX_DEFAULT_DASHBOARD_ID\",\"panelIndex\":8,\"row\":9,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWn9CCcyAztPIDR8zmfY_DEFAULT_DASHBOARD_ID\",\"panelIndex\":9,\"row\":13,\"size_x\":6,\"size_y\":8,\"type\":\"visualization\"},{\"col\":3,\"id\":\"AWn9e4bBAztPIDR8znG8_DEFAULT_DASHBOARD_ID\",\"panelIndex\":12,\"row\":21,\"size_x\":10,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"AWn9CEi1AztPIDR8zmfZ_DEFAULT_DASHBOARD_ID\",\"panelIndex\":10,\"row\":13,\"size_x\":6,\"size_y\":8,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWn9e2vBAztPIDR8znG7_DEFAULT_DASHBOARD_ID\",\"panelIndex\":11,\"row\":21,\"size_x\":2,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"AWn9B08ZAztPIDR8zmfS_DEFAULT_DASHBOARD_ID\",\"panelIndex\":3,\"row\":4,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"}]",
    "optionsJSON": "{\"darkTheme\":false}",
    "uiStateJSON": "{\"P-0\":{\"vis\":{\"legendOpen\":false}},\"P-10\":{\"vis\":{\"legendOpen\":false,\"params\":{\"sort\":{\"columnIndex\":0,\"direction\":\"desc\"}}}},\"P-11\":{\"vis\":{\"legendOpen\":false}},\"P-12\":{\"vis\":{\"legendOpen\":false}},\"P-2\":{\"vis\":{\"defaultColors\":{\"0 - 100\":\"rgb(0,104,55)\"},\"legendOpen\":false}},\"P-3\":{\"vis\":{\"defaultColors\":{\"0 - 100\":\"rgb(0,104,55)\"},\"legendOpen\":false}},\"P-4\":{\"vis\":{\"legendOpen\":false}},\"P-5\":{\"vis\":{\"legendOpen\":false}},\"P-6\":{\"vis\":{\"legendOpen\":false}},\"P-7\":{\"vis\":{\"legendOpen\":false}},\"P-8\":{\"vis\":{\"legendOpen\":false}},\"P-9\":{\"vis\":{\"legendOpen\":false,\"params\":{\"sort\":{\"columnIndex\":0,\"direction\":\"desc\"}}}}}",
    "version": 1,
    "timeRestore": true,
    "timeTo": "now",
    "timeFrom": "now-1h",
    "refreshInterval": {
      "display": "5 seconds",
      "pause": false,
      "section": 1,
      "value": 5000
    },
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}],\"highlightAll\":true,\"version\":true}"
    }
  }
});

exports.dashboards = dashboards;