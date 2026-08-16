async function main() {
  const healthModule = await import("../../platform/app/lib/sotaLab/health.ts");
  const { getSotaLabHealth } = "default" in healthModule
    ? healthModule.default as typeof healthModule
    : healthModule;
  console.log(JSON.stringify(await getSotaLabHealth(), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
