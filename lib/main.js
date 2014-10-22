var request = require("sdk/request");
var simplePrefs = require("sdk/simple-prefs");
var tabs = require("sdk/tabs");
var timers = require("sdk/timers");

var hardRefreshTimeCounter = 0;
var softRefreshTimeCounter = 0;
var urlsToContents = {};

function performHardRefresh()
{
    for (let tab of tabs)
    {
        console.debug("hard-reloading tab " + tab.id);
        tab.reload();
    }
}

function performSoftRefresh()
{
    for (let tab of tabs)
    {
        console.debug("requesting content of tab " + tab.id);
        (function (tabId, tabUrl) {
            request.Request({
                url: tabUrl,
                onComplete: function (response) {
                    compareAndPossiblyRefresh(tabId, response);
                }
            }).get();
        })(tab.id, tab.url.toString());
    }
}

function compareAndPossiblyRefresh(tabId, response)
{
    console.debug("tab " + tabId + " contents received");

    if (response.status != 200)
    {
        console.debug("content request for tab " + tabId + " returned " + response.status + " -- not reloading");
        return;
    }

    // find the tab
    var tab = null;
    for (let thisTab of tabs)
    {
        if (thisTab.id == tabId)
        {
            tab = thisTab;
        }
    }
    if (tab == null)
    {
        // can't find the tab anymore... skip
        return;
    }

    var url = tab.url.toString();
    var currentContent = urlsToContents[url];
    if (currentContent != response.text)
    {
        console.debug("tab " + tabId + " content changed; reloading");
        urlsToContents[url] = response.text;
        tab.reload();
    }
    else
    {
        console.debug("tab " + tabId + " content didn't change");
    }
}

function checkRefreshTime()
{
    console.debug("checking refresh time!");
    var hardTime = hardRefreshTimeCounter / 60;
    var softTime = softRefreshTimeCounter / 60;
    if (hardTime >= simplePrefs.prefs.hardRefreshMinutes)
    {
        hardRefreshTimeCounter = 0;
        console.debug("hard refresh time!");
        performHardRefresh();
    }
    else if (softTime >= simplePrefs.prefs.softRefreshMinutes)
    {
        softRefreshTimeCounter = 0;
        console.debug("soft refresh time!");
        performSoftRefresh();
    }

    hardRefreshTimeCounter += 5;
    softRefreshTimeCounter += 5;
}

timers.setInterval(checkRefreshTime, 5000);

// vim: set ts=4 et sw=4 sts=4:
