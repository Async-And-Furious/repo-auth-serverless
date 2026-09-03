import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

describe("delivery workflow contract", () => {
  it("keeps automatic HML and protected production delivery distinct", () => {
    expect(workflow).toContain("github.ref == 'refs/heads/develop'");
    expect(workflow).toContain("github.ref == 'refs/heads/main' && 'production'");
    expect(workflow).toContain("AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}");
    expect(workflow).toContain("AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}");
    expect(workflow).toContain("AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }}");
    expect(workflow).toContain("aws-access-key-id: ${{ env.AWS_ACCESS_KEY_ID }}");
    expect(workflow).toContain("aws-secret-access-key: ${{ env.AWS_SECRET_ACCESS_KEY }}");
    expect(workflow).toContain("aws-session-token: ${{ env.AWS_SESSION_TOKEN }}");
    expect(workflow).toContain("(github.event_name == 'workflow_dispatch' || github.event_name == 'workflow_call') && inputs.operation == 'apply'");
    expect(workflow).not.toContain("Production requires OIDC credentials; Academy credentials are not permitted.");
  });

  it("keeps destructive operations manual and HML-only", () => {
    expect(workflow).toContain("options: [plan, apply, destroy-plan, destroy]");
    expect(workflow).toContain('[ "$ENVIRONMENT" = "hml" ]');
    expect(workflow).toContain('[ "$CONFIRM" = "DESTROY HML" ]');
    expect(workflow).not.toContain("Destroy operations require Academy mode.");
    expect(workflow).toContain('TFVARS_ACADEMY_MODE: "false"');
  });

  it("ships the exact package used by the saved plan", () => {
    expect(workflow).toContain("dist.zip");
    expect(workflow).toContain("actions/download-artifact@v4");
    expect(workflow).toContain("terraform-plan-${{ env.DEPLOY_ENVIRONMENT }}-${{ github.run_id }}");
    expect(workflow).toContain("path: .");
  });
});
