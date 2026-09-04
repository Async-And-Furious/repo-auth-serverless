import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const downWorkflow = readFileSync(new URL("../.github/workflows/down.yml", import.meta.url), "utf8");

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
    expect(workflow).toContain("if: env.DEPLOY_ENVIRONMENT == 'prod' && env.DEPLOY_OPERATION == 'apply' && (github.event_name == 'workflow_dispatch' || github.event_name == 'workflow_call')");
    expect(workflow).toContain('[ "$CONFIRM" = "APPLY PROD" ]');
  });

  it("keeps destructive operations manual and HML-only", () => {
    expect(workflow).toContain("options: [plan, apply, destroy-plan, destroy]");
    expect(workflow).toContain('[ "$ENVIRONMENT" = "hml" ]');
    expect(workflow).toContain('[ "$CONFIRM" = "DESTROY HML" ]');
    expect(workflow).toContain('TFVARS_ACADEMY_MODE: "false"');
  });

  it("ships the exact package used by the saved plan", () => {
    expect(workflow).toContain("dist.zip");
    expect(workflow).toContain("actions/download-artifact@v4");
    expect(workflow).toContain("terraform-plan-${{ env.DEPLOY_ENVIRONMENT }}-${{ github.run_id }}");
    expect(workflow).toContain("path: .");
  });

  it("does not allow production to use an HML backend listener", () => {
    expect(workflow).toContain("Validate production backend source");
    expect(workflow).toContain("vars.BACKEND_INTEGRATION_URI");
    expect(workflow).toContain("tc3-hml-internal");
    expect(workflow).toContain("production environment BACKEND_INTEGRATION_URI");
  });

  it("allows production destroy only through the explicit dispatch contract", () => {
    expect(workflow).toContain('Production destroy is allowed only through workflow_dispatch.');
    expect(workflow).toContain('[ "$CONFIRM" = "DESTROY PROD" ]');
    expect(workflow).toContain("environment: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && 'production'");
    expect(workflow).toContain('prepare-destroy-backend.sh repo-auth-serverless "${{ env.DEPLOY_ENVIRONMENT }}"');
    expect(workflow).toContain("working-directory: infra/${{ env.DEPLOY_ENVIRONMENT }}");
    expect(workflow).toContain("external JWT/database secrets and S3 backend");
    expect(downWorkflow).toContain("options: [hml, prod]");
    expect(downWorkflow).toContain("environment: ${{ inputs.environment }}");
    expect(downWorkflow).toContain("operation: destroy");
  });
});
