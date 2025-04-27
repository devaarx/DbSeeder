<script>
    import { onMount } from "svelte";
    import Papa from "papaparse";
    import initPocketBase from "./lib/services/pocketbase";

    let client = $state(null);
    let clientUrl = $state("");
    let errorText = $state("");
    let headers = $state(null);
    let fileData = $state(null);
    let selectedFile = $state(null);
    let collectionName = $state("");
    let isWriting = $state(false);
    let showParseSuccess = $state(false);
    let successText = $state("");
    let totalUploads = $state(0);
    let uploadInterval = $state("1000");

    onMount(() => {
        const savedClientUrl = localStorage.getItem("clientUrl");
        if (savedClientUrl) {
            clientUrl = savedClientUrl;
        }
    });

    function initClient() {
        errorText = "";
        if (!clientUrl) {
            errorText = "Please enter a valid Pocketbase URL.";
            return;
        }
        const pb = initPocketBase(clientUrl);
        if (pb) {
            client = pb;
            localStorage.setItem("clientUrl", clientUrl);
        } else {
            clientUrl = "";
            client = null;
        }
    }

    function resetClient() {
        client = null;
        clientUrl = "";
        errorText = "";
        fileData = null;
        selectedFile = null;
        headers = null;
        collectionName = "";
        isWriting = false;
        showParseSuccess = false;
        successText = "";
        totalUploads = 0;
        uploadInterval = "1000";
        // localStorage.removeItem("clientUrl");
    }

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        selectedFile = file;
        errorText = "";
        fileData = null;

        try {
            Papa.parse(file, {
                header: true,
                complete: function (results, file) {
                    if (results?.data?.length === 0) {
                        errorText = "No data found in the file.";
                    } else {
                        showParseSuccess = true;
                        setTimeout(() => {
                            showParseSuccess = false;
                        }, 3000);
                        fileData = results.data;
                        headers = results.meta.fields;
                    }
                },
                error: function (error) {
                    console.error("Parsing error:", error);
                    errorText = "Error parsing file: " + error.message;
                },
            });
        } catch (error) {
            errorText = error.message;
            selectedFile = null;
        }
    }

    async function seedPocketbase() {
        if (!client || !fileData || !collectionName) {
            errorText = "Please select a file and collection name.";
            return;
        }

        isWriting = true;
        errorText = "";
        successText = "";

        try {
            for (const row of fileData) {
                await new Promise((resolve) =>
                    setTimeout(resolve, Number(uploadInterval))
                );
                let payload = {};
                for (const header of headers) {
                    payload[header] = row[header];
                }
                await client.collection(collectionName).create(payload);
                totalUploads += 1;
            }
            successText = "Data seeded successfully!";
        } catch (error) {
            console.error("Seeding error:", error);
            errorText = "Error seeding data: " + error.message;
        } finally {
            isWriting = false;
        }
    }
</script>

<main
    class="bg-slate-200 p-4 grid h-screen grid-rows-[30px_1fr] w-screen gap-4"
>
    <div>
        <h2 class="text-slate-600 text-xl font-semibold">DbSeeder</h2>
    </div>
    <div class="grid grid-cols-[400px_1fr] gap-4 overflow-hidden">
        <div
            class="bg-base-100 border-base-300 px-6 py-4 rounded-lg flex flex-col gap-12"
        >
            <div>
                <div class="mb-4">
                    <div class="text-slate-500 pb-1 text-sm">
                        Pocketbase Endpoint
                    </div>
                    <label class="input w-full">
                        <span class="label">
                            <ion-icon name="link-outline"></ion-icon>
                        </span>
                        <input
                            type="url"
                            placeholder="https://pocketbase.example.com"
                            disabled={!!client}
                            bind:value={clientUrl}
                        />
                    </label>
                </div>
                <div class="mb-4 opacity-40">
                    <div class="text-slate-500 pb-1 text-sm">
                        Authentication Token (coming soon)
                    </div>
                    <label class="input w-full">
                        <span class="label">
                            <ion-icon name="key-outline"></ion-icon>
                        </span>
                        <input
                            type="text"
                            disabled={true}
                            placeholder="Bearer ..."
                        />
                    </label>
                </div>
                <div class="flex gap-4">
                    <button
                        class="btn btn-neutral"
                        disabled={!!client}
                        onclick={initClient}
                    >
                        <ion-icon name="play-outline"></ion-icon>
                        Initialize Pocketbase
                    </button>
                    {#if client}
                        <button class="btn btn-error" onclick={resetClient}>
                            <ion-icon name="close-outline"></ion-icon>
                            Disconnect
                        </button>
                    {/if}
                </div>
            </div>
            <div>
                <div class="mb-4">
                    <div class="text-slate-500 pb-1 text-sm">
                        Collection Name
                    </div>
                    <label class="input w-full">
                        <span class="label">
                            <ion-icon name="file-tray-full-outline"></ion-icon>
                        </span>
                        <input
                            type="text"
                            placeholder="Example: users"
                            bind:value={collectionName}
                        />
                    </label>
                </div>
                <div class="mb-4">
                    <div class="text-slate-500 pb-1 text-sm">Pick a file</div>
                    <fieldset class="fieldset w-full p-0">
                        <input
                            type="file"
                            class="file-input w-full"
                            accept=".csv"
                            disabled={!client || !collectionName}
                            onchange={handleFileSelect}
                        />
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="label"
                            >Only CSV files are supported.</label
                        >
                    </fieldset>
                </div>
                {#if fileData && showParseSuccess}
                    <div
                        role="alert"
                        class="alert alert-vertical alert-success sm:alert-horizontal"
                    >
                        <ion-icon name="alert-circle-outline" class="size-6"
                        ></ion-icon>
                        <div>
                            <h3 class="font-bold">File parsed successfully!</h3>
                            <div class="text-xs">
                                Make sure the headers match the collection
                                fields
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex-1 flex flex-col justify-end">
                <div>
                    {#if isWriting}
                        <div
                            role="alert"
                            class="alert relative alert-vertical alert-info sm:alert-horizontal"
                        >
                            <span class="loading loading-spinner loading-sm"
                            ></span>
                            <div>
                                <h3 class="font-bold">
                                    Writing to Pocketbase...
                                </h3>
                                <div class="text-xs">
                                    Please wait while we write the data to the
                                    collection.
                                </div>
                                {#if totalUploads > 0}
                                    <div class="text-xs pt-1">
                                        {totalUploads} records uploaded
                                    </div>
                                {/if}
                            </div>
                            <button
                                class="btn btn-sm btn-neutral"
                                onclick={resetClient}
                            >
                                <ion-icon name="stop-circle" class="size-4"
                                ></ion-icon>
                                Stop
                            </button>
                        </div>
                    {/if}
                    {#if errorText}
                        <div role="alert" class="alert alert-warning">
                            <ion-icon name="warning-outline"></ion-icon>
                            <span>{errorText}</span>
                        </div>
                    {/if}
                    {#if successText}
                        <div role="alert" class="alert alert-success">
                            <ion-icon name="checkmark-circle-outline"
                            ></ion-icon>
                            <span>{successText}</span>
                        </div>
                    {/if}
                </div>
                <div class="pt-4 flex items-end gap-3">
                    <fieldset class="fieldset p-0">
                        <legend class="fieldset-legend">Upload interval</legend>
                        <select
                            class="select"
                            disabled={isWriting}
                            bind:value={uploadInterval}
                        >
                            <option value="0">Immediate</option>
                            <option value="500">0.5 second</option>
                            <option value="1000" selected>1 second</option>
                            <option value="2000">2 seconds</option>
                            <option value="5000">5 seconds</option>
                        </select>
                    </fieldset>
                    <button
                        class="btn btn-success flex-1"
                        disabled={isWriting}
                        onclick={seedPocketbase}
                    >
                        {#if isWriting}
                            <ion-icon name="refresh-outline"></ion-icon>
                            Seeding...
                        {:else}
                            <ion-icon name="cloud-upload-outline"></ion-icon>
                            Seed Pocketbase
                        {/if}
                    </button>
                </div>
            </div>
        </div>
        {#if fileData}
            <div
                class="bg-base-100 border-base-300 px-6 py-4 rounded-lg flex flex-col overflow-auto"
            >
                <div class="text-slate-500 pb-3 text-sm">File Preview</div>
                <div class="overflow-auto flex-1 min-h-0">
                    <table
                        class="table table-xs table-zebra border border-slate-100"
                    >
                        <thead>
                            <tr>
                                {#each headers as header}
                                    <th>{header}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each fileData as row}
                                <tr>
                                    {#each headers as header}
                                        <td>{row[header]}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {:else}
            <div class="flex flex-col justify-center items-center">
                <ion-icon name="document-outline" class="text-slate-500 size-6"
                ></ion-icon>
                <div class="text-slate-500 pt-2">No file selected</div>
            </div>
        {/if}
    </div>
</main>
