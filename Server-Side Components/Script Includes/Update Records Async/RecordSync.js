var UpdateMultipleRecordsAsync = Class.create();
UpdateMultipleRecordsAsync.prototype = {
    initialize: function() {
        this.secondsBetweenChunks = 1;
    },

    updateRecordsAsync: function(tableName, encodedQuery, keyValueObject, executeBusinessRules, chunkSize, runOnce) {
        this.metaData = {
            id: gs.generateGUID(),
            iteration: 0,
            params: {
                table: tableName,
                query: encodedQuery,
                values: keyValueObject,
                runBRs: executeBusinessRules == true,
                chunk: chunkSize || 100,
                runOnce: runOnce == true
            }
        };
        this._log("Starting async update...");
        this._scheduleNextJob();
    },

    updateAndScheduleNext: function(meta) {
        this.metaData = meta;
        var gr = new GlideRecord(meta.params.table);
        gr.addEncodedQuery(meta.params.query);
        gr.setLimit(meta.params.chunk);
        if (!meta.params.runBRs) gr.setWorkflow(false);
        gr.query();

        var count = 0;
        while (gr.next()) {
            for (var key in meta.params.values)
                gr.setValue(key, meta.params.values[key]);
            gr.update();
            count++;
        }

        this._log("Updated " + count + " records");

        if (count == meta.params.chunk && !meta.params.runOnce) {
            this._scheduleNextJob();
        } else {
            this._log("Async job complete");
        }
    },

    _scheduleNextJob: function() {
        var script = "new UpdateMultipleRecordsAsync().updateAndScheduleNext(" + JSON.stringify(this.metaData) + ");";
        var nextTime = new GlideDateTime();
        nextTime.addSeconds(this.secondsBetweenChunks);

        var trigger = new GlideRecord("sys_trigger");
        trigger.initialize();
        trigger.name = "AsyncUpdate_" + this.metaData.id;
        trigger.next_action = nextTime;
        trigger.script = script;
        trigger.trigger_type = 0; // Run once
        trigger.insert();
    },

    _log: function(msg) {
        gs.log(msg, "UpdateMultipleRecordsAsync");
    },

    type: 'UpdateMultipleRecordsAsync'
};
