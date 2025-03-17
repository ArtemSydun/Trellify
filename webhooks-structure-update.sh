#!/bin/bash

# MongoDB connection details
MONGO_URI="mongodb://admin:password@localhost:27017/"  # No trailing slash
WEBHOOKS_COLLECTION="trello_webhooks"  # Webhooks collection

# MongoDB script to modify all webhooks
UPDATE_QUERY='
const webhooks = db.'"$WEBHOOKS_COLLECTION"'.find({}).toArray();

webhooks.forEach(webhook => {
    if (webhook.notifications) {
        // Ensure "board" includes "admin" data
        if (webhook.notifications.admin) {
            webhook.notifications.board = {
                ...webhook.notifications.board, // Keep existing board notifications
                ...webhook.notifications.admin  // Merge admin notifications into board
            };
            delete webhook.notifications.admin; // Remove "admin" after merging
        }

        // Always set "notifications.list" with empty arrays
        webhook.notifications.list = {
            listCreated: [],
            listRenamed: [],
            listArchived: [],
            listUnarchived: [],
            listDeleted: []
        };

        // Print debug info
        print("Updated notifications.list for webhook:", webhook.id, JSON.stringify(webhook.notifications.list));

        // Update MongoDB document
        db.'"$WEBHOOKS_COLLECTION"'.updateOne(
            { id: webhook.id },
            { $set: { "notifications": webhook.notifications } }
        );
        print("Updated webhook:", webhook.id);
    }
});

print("All webhooks updated successfully.");
'

# Run the MongoDB command and capture the exit status
echo "$UPDATE_QUERY" | mongosh "$MONGO_URI" --quiet
EXIT_STATUS=$?

# ✅ Check if MongoDB returned an error
if [ $EXIT_STATUS -ne 0 ]; then
    echo "Error: Failed to update webhooks."
    exit 1
else
    echo "All webhooks updated successfully."
fi
