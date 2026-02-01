using KeyboxSdk;

Console.WriteLine("Starting KeyBox test...");

try
{
    await KeyboxClient.ActivateLicenseAsync(
        productName: "DemoApp",
        key: "697-3B02-E2E7-14FE",
        apiUrl: "https://api-keybox.vercel.app"
    );

    await KeyboxClient.StartLicenseDaemonAsync(
        productName: "DemoApp",
        key: "697-3B02-E2E7-14FE",
        intervalSeconds: 5,

        onStart: data =>
        {
            Console.WriteLine("LICENSE OK → App running");
        },

        onStop: data =>
        {
            Console.WriteLine("LICENSE INVALID → App stopped");
            Environment.Exit(1);
        }
    );

    Console.WriteLine("Press Ctrl+C to exit...");
    await Task.Delay(-1);
}
catch (Exception ex)
{
    Console.WriteLine("Startup failed: " + ex.Message);
}
