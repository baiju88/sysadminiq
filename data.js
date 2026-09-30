// Embedded SysAdminIQ data for Cloudflare Pages.
const KB_ARTICLES=[
  {
    "id": "host-not-responding",
    "category": "ESXi",
    "title": "ESXi host shows Not Responding but ping works",
    "keywords": [
      "not responding",
      "host disconnected",
      "ping",
      "hostd",
      "vpxa",
      "web ui slow"
    ],
    "symptoms": [
      "Host remains reachable by ICMP",
      "vCenter inventory shows Not Responding",
      "Host Client may be slow or unavailable"
    ],
    "causes": [
      "hostd or vpxa service issue",
      "Management network/DNS issue",
      "Resource exhaustion",
      "Certificate or vCenter communication issue"
    ],
    "checks": [
      "Verify management VMkernel connectivity",
      "Check DNS forward/reverse resolution",
      "Review hostd.log and vpxa.log",
      "Check disk and memory pressure",
      "Validate vCenter-to-host connectivity"
    ],
    "commands": "tail -f /var/log/hostd.log\ntail -f /var/log/vpxa.log\nesxcli network ip interface list\nvdf -h",
    "logs": [
      "/var/run/log/hostd.log",
      "/var/run/log/vpxa.log",
      "/var/run/log/vmkernel.log"
    ],
    "resolution": [
      "Correct network/DNS issues first",
      "Investigate service errors before restarting agents",
      "Restart management services only under approved operational procedure",
      "Reconnect host after communication is restored"
    ],
    "verification": [
      "Host status becomes Connected",
      "Tasks complete normally",
      "Logs stop showing repeated communication failures"
    ],
    "platform": "VMware"
  },
  {
    "id": "vcsa-disk",
    "category": "vCenter",
    "title": "vCenter Diagnostics Disk Exhaustion / partition filling",
    "keywords": [
      "disk exhaustion",
      "archive",
      "core",
      "vpxd-worker",
      "vcenter disk full",
      "diagnostics"
    ],
    "symptoms": [
      "vCenter alarm reports partition usage",
      "Services may become slow or fail",
      "Large logs or core files consume space"
    ],
    "causes": [
      "Unexpected log growth",
      "Repeated service crash generating diagnostics",
      "Old archive data",
      "Underlying issue repeatedly producing errors"
    ],
    "checks": [
      "Identify the full filesystem with df -h",
      "Find largest directories and files",
      "Check service and application logs around growth time",
      "Determine why files were generated before deleting anything"
    ],
    "commands": "df -h\ndu -xhd1 /storage | sort -h\nfind /storage -type f -size +500M -ls\nservice-control --status --all",
    "logs": [
      "/var/log/vmware/vpxd/vpxd.log",
      "/var/log/vmware/vmon/vmon.log"
    ],
    "resolution": [
      "Identify root cause of log/core growth",
      "Follow supported retention or cleanup procedure",
      "Free sufficient space and confirm services",
      "Monitor growth after remediation"
    ],
    "verification": [
      "Filesystem utilization remains stable",
      "vCenter services are healthy",
      "No new rapid diagnostic growth"
    ],
    "platform": "VMware"
  },
  {
    "id": "snapshot-consolidation",
    "category": "VM",
    "title": "Virtual machine needs disk consolidation",
    "keywords": [
      "consolidation",
      "snapshot",
      "delta",
      "vmdk locked",
      "disk consolidation needed"
    ],
    "symptoms": [
      "Consolidation alarm is raised",
      "Snapshot manager may show no visible snapshots",
      "Delta disks remain"
    ],
    "causes": [
      "Snapshot delete did not complete",
      "Backup operation left delta chain",
      "File lock or insufficient space"
    ],
    "checks": [
      "Review Snapshot Manager and VM directory",
      "Check datastore free space",
      "Identify backup activity",
      "Review task/event history"
    ],
    "commands": "Get-VM \"VMNAME\" | Get-Snapshot\nGet-VM \"VMNAME\" | Get-VMQuestion",
    "logs": [
      "vpxd.log",
      "hostd.log",
      "vmkernel.log"
    ],
    "resolution": [
      "Confirm backup jobs are not active",
      "Ensure adequate datastore space",
      "Run supported consolidation workflow",
      "Investigate locks if consolidation fails"
    ],
    "verification": [
      "Consolidation alarm clears",
      "No orphaned delta chain remains",
      "Datastore usage is as expected"
    ],
    "platform": "VMware"
  },
  {
    "id": "vpxd-service",
    "category": "vCenter",
    "title": "vCenter service / vpxd fails to start",
    "keywords": [
      "vpxd failed",
      "vcenter service failed",
      "service-control",
      "vmon",
      "postgres"
    ],
    "symptoms": [
      "vSphere Client unavailable or partial",
      "vpxd is stopped",
      "vMon reports service dependency or startup errors"
    ],
    "causes": [
      "Disk exhaustion",
      "Database/connectivity problem",
      "Certificate issue",
      "Service dependency failure"
    ],
    "checks": [
      "Check overall service status",
      "Review vmon and vpxd logs around first failure",
      "Check disk utilization",
      "Avoid repeated blind restarts"
    ],
    "commands": "service-control --status --all\ntail -200 /var/log/vmware/vmon/vmon.log\ntail -200 /var/log/vmware/vpxd/vpxd.log\ndf -h",
    "logs": [
      "/var/log/vmware/vmon/vmon.log",
      "/var/log/vmware/vpxd/vpxd.log"
    ],
    "resolution": [
      "Fix the earliest underlying error",
      "Resolve capacity/dependency/certificate issue",
      "Start services using supported order or appliance management workflow"
    ],
    "verification": [
      "vpxd remains Running",
      "vSphere Client login works",
      "No recurring startup errors"
    ],
    "platform": "VMware"
  },
  {
    "id": "vmotion",
    "category": "vMotion",
    "title": "vMotion fails or migration cannot complete",
    "keywords": [
      "vmotion",
      "migration",
      "shared storage",
      "could not reach shared storage",
      "network"
    ],
    "symptoms": [
      "Migration task fails",
      "Compatibility or network error",
      "Destination validation fails"
    ],
    "causes": [
      "vMotion VMkernel reachability",
      "MTU mismatch",
      "Shared storage visibility issue",
      "CPU compatibility or resource constraints"
    ],
    "checks": [
      "Verify vmkping between vMotion interfaces",
      "Validate MTU end-to-end",
      "Confirm shared datastore visibility",
      "Review task error and vmkernel logs"
    ],
    "commands": "vmkping -I vmkX <destination-vmotion-ip>\nvmkping -I vmkX -d -s 8972 <destination-vmotion-ip>\nesxcli storage filesystem list",
    "logs": [
      "/var/run/log/vmkernel.log",
      "/var/run/log/hostd.log"
    ],
    "resolution": [
      "Correct network/storage compatibility issue",
      "Retest connectivity",
      "Retry migration after validation"
    ],
    "verification": [
      "vMotion completes",
      "No repeated vmkernel network/storage errors"
    ],
    "platform": "VMware"
  },
  {
    "id": "certificates",
    "category": "Certificates",
    "title": "vCenter / ESXi certificate communication problems",
    "keywords": [
      "certificate",
      "ssl",
      "thumbprint",
      "trust",
      "machine ssl",
      "vecs"
    ],
    "symptoms": [
      "Connection or trust errors",
      "Services fail after certificate change",
      "Host communication warnings"
    ],
    "causes": [
      "Expired certificate",
      "Incorrect replacement chain",
      "Trust mismatch",
      "Time synchronization problem"
    ],
    "checks": [
      "Check certificate validity and service logs",
      "Confirm NTP/time",
      "Validate certificate chain and endpoint"
    ],
    "commands": "vecs-cli store list\nvecs-cli entry list --store MACHINE_SSL_CERT --text\ndate",
    "logs": [
      "vmon.log",
      "vpxd.log"
    ],
    "resolution": [
      "Use supported certificate workflow",
      "Replace only the required certificate/store",
      "Restart affected services as required"
    ],
    "verification": [
      "Certificate validity is correct",
      "Services remain healthy",
      "No trust errors in logs"
    ],
    "platform": "VMware"
  },
  {
    "id": "ha-fdm",
    "category": "HA / DRS",
    "title": "HA agent / FDM communication problem",
    "keywords": [
      "ha",
      "fdm",
      "agent unreachable",
      "isolation",
      "master"
    ],
    "symptoms": [
      "HA configuration reports an agent issue",
      "Host may not join cluster protection"
    ],
    "causes": [
      "Management network issue",
      "DNS issue",
      "Agent configuration problem"
    ],
    "checks": [
      "Check fdm.log",
      "Validate management connectivity and DNS",
      "Review cluster events"
    ],
    "commands": "tail -200 /var/log/fdm.log\nesxcli network ip interface list",
    "logs": [
      "/var/run/log/fdm.log",
      "/var/run/log/hostd.log"
    ],
    "resolution": [
      "Correct connectivity/DNS issue",
      "Reconfigure HA through supported vCenter workflow if required"
    ],
    "verification": [
      "HA status becomes healthy",
      "No new FDM errors"
    ],
    "platform": "VMware"
  },
  {
    "id": "storage-apd",
    "category": "Storage",
    "title": "APD / datastore accessibility investigation",
    "keywords": [
      "apd",
      "all paths down",
      "datastore inaccessible",
      "storage path",
      "pdl"
    ],
    "symptoms": [
      "VM I/O may stall",
      "Datastore inaccessible warnings",
      "VMkernel storage errors"
    ],
    "causes": [
      "Array/path outage",
      "Fabric issue",
      "HBA/driver issue",
      "Network storage reachability problem"
    ],
    "checks": [
      "Determine scope and affected hosts",
      "Review vmkernel storage events",
      "Check paths and device state",
      "Engage storage/network teams with timestamps"
    ],
    "commands": "esxcli storage core path list\nesxcli storage core device list",
    "logs": [
      "/var/run/log/vmkernel.log"
    ],
    "resolution": [
      "Restore storage path availability",
      "Validate all affected paths",
      "Confirm datastore accessibility before clearing incident"
    ],
    "verification": [
      "Paths return to expected state",
      "VM I/O stabilizes",
      "No recurring APD events"
    ],
    "platform": "VMware"
  },
  {
    "id": "find-large-vm-snapshots",
    "category": "PowerCLI",
    "title": "Find Large VM Snapshots and Export Report",
    "keywords": [
      "snapshots",
      "snapshot size",
      "large snapshots",
      "powercli",
      "export report"
    ],
    "symptoms": [
      "Need an inventory of VM snapshots, size and datastore usage."
    ],
    "causes": [
      "Snapshot sprawl",
      "Long-running backup snapshots"
    ],
    "checks": [
      "Connect to the correct vCenter",
      "Confirm PowerCLI/VCF.PowerCLI compatibility"
    ],
    "commands": "Get-VM | Get-Snapshot | Select VM,Name,Created,SizeMB,SizeGB | Sort SizeGB -Descending | Export-Csv snapshots.csv -NoTypeInformation",
    "logs": [
      "PowerCLI console output",
      "vCenter task history"
    ],
    "resolution": [
      "Review large or old snapshots with application owners",
      "Use approved deletion/consolidation workflow"
    ],
    "verification": [
      "Report generated",
      "Snapshot growth is under control"
    ]
  },
  {
    "id": "cisco-ucs-blade-diagnostics",
    "category": "Hardware",
    "title": "Cisco UCS Blade Hardware Diagnostics",
    "keywords": [
      "UCS",
      "blade diagnostics",
      "DIMM",
      "CPU",
      "PCIe",
      "hardware diagnostics"
    ],
    "symptoms": [
      "Suspected CPU, DIMM, PCIe or hardware instability on a blade."
    ],
    "causes": [
      "DIMM errors",
      "CPU hardware issues",
      "PCIe device faults",
      "Firmware mismatch"
    ],
    "checks": [
      "Collect UCS fault information",
      "Verify blade model and diagnostic ISO compatibility",
      "Capture current service profile state"
    ],
    "commands": "# UCS Manager: review Faults and Equipment Inventory\n# Boot approved UCS diagnostics ISO via KVM Virtual Media",
    "logs": [
      "UCS Manager fault/event logs",
      "Diagnostic ISO output"
    ],
    "resolution": [
      "Run approved diagnostics",
      "Document component errors",
      "Replace failed hardware through supported maintenance procedures"
    ],
    "verification": [
      "No recurring hardware faults",
      "Blade passes diagnostics"
    ],
    "platform": "Cisco UCS"
  },
  {
    "id": "windows-service-down",
    "category": "Windows",
    "title": "Windows service is stopped or application is unavailable",
    "keywords": [
      "windows",
      "service",
      "is",
      "stopped",
      "or",
      "application",
      "is",
      "unavailable"
    ],
    "symptoms": [
      "Service cannot start",
      "Application unavailable",
      "Event Viewer errors"
    ],
    "causes": [
      "Dependency failure",
      "Incorrect service account",
      "Port conflict",
      "Resource exhaustion"
    ],
    "checks": [
      "Check service state",
      "Review Windows System and Application event logs",
      "Check dependencies and startup type",
      "Validate listening ports"
    ],
    "commands": "Get-Service <service>\nGet-WinEvent -LogName System -MaxEvents 50\nnetstat -ano",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Windows"
  },
  {
    "id": "windows-high-cpu",
    "category": "Windows",
    "title": "Windows Server high CPU or memory usage",
    "keywords": [
      "windows",
      "server",
      "high",
      "cpu",
      "or",
      "memory",
      "usage"
    ],
    "symptoms": [
      "Slow server",
      "High CPU",
      "High memory"
    ],
    "causes": [
      "Runaway process",
      "Memory pressure",
      "Scheduled workload",
      "Disk paging"
    ],
    "checks": [
      "Identify top processes",
      "Check Task Manager/Performance Monitor",
      "Review recent changes",
      "Check paging and disk latency"
    ],
    "commands": "Get-Process | Sort CPU -Descending | Select -First 10\nGet-Counter \"\\Processor(_Total)\\% Processor Time\"",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Windows"
  },
  {
    "id": "windows-rdp",
    "category": "Windows",
    "title": "Cannot connect to Windows Server using RDP",
    "keywords": [
      "cannot",
      "connect",
      "to",
      "windows",
      "server",
      "using",
      "rdp"
    ],
    "symptoms": [
      "RDP timeout",
      "Authentication failure",
      "Connection refused"
    ],
    "causes": [
      "RDP service stopped",
      "Firewall rule blocked",
      "Network path issue",
      "NLA or credential issue"
    ],
    "checks": [
      "Test TCP connectivity",
      "Verify TermService status",
      "Check Windows Firewall",
      "Review Event Viewer"
    ],
    "commands": "Test-NetConnection <server> -Port 3389\nGet-Service TermService\nGet-NetFirewallRule -DisplayGroup \"Remote Desktop\"",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Windows"
  },
  {
    "id": "linux-disk-full",
    "category": "Linux",
    "title": "Linux filesystem is full",
    "keywords": [
      "linux",
      "filesystem",
      "is",
      "full"
    ],
    "symptoms": [
      "No space left on device",
      "Services fail to write logs",
      "Package updates fail"
    ],
    "causes": [
      "Large logs",
      "Runaway files",
      "Old backups",
      "Deleted but open files"
    ],
    "checks": [
      "Check filesystem usage",
      "Identify large directories",
      "Check open deleted files",
      "Review log rotation"
    ],
    "commands": "df -h\ndu -xhd1 / | sort -h\nlsof +L1",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Linux"
  },
  {
    "id": "linux-service-failed",
    "category": "Linux",
    "title": "Linux systemd service failed",
    "keywords": [
      "linux",
      "systemd",
      "service",
      "failed"
    ],
    "symptoms": [
      "Service unavailable",
      "systemctl failed",
      "Application not listening"
    ],
    "causes": [
      "Configuration error",
      "Dependency failure",
      "Permission issue",
      "Port conflict"
    ],
    "checks": [
      "Check service status",
      "Read journal logs",
      "Validate configuration",
      "Check listening ports"
    ],
    "commands": "systemctl status <service>\njournalctl -u <service> -n 100 --no-pager\nss -lntup",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Linux"
  },
  {
    "id": "linux-high-load",
    "category": "Linux",
    "title": "Linux server high load or performance issue",
    "keywords": [
      "linux",
      "server",
      "high",
      "load",
      "or",
      "performance",
      "issue"
    ],
    "symptoms": [
      "High load average",
      "Slow response",
      "High CPU or IO wait"
    ],
    "causes": [
      "CPU saturation",
      "Memory pressure",
      "Disk IO",
      "Runaway process"
    ],
    "checks": [
      "Check uptime/load",
      "Identify CPU processes",
      "Check memory and swap",
      "Check IO wait"
    ],
    "commands": "uptime\ntop -b -n 1 | head -30\nfree -h\niostat -xz 1 3",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Linux"
  },
  {
    "id": "aws-ec2-connectivity",
    "category": "AWS",
    "title": "AWS EC2 instance is unreachable",
    "keywords": [
      "aws",
      "ec2",
      "instance",
      "is",
      "unreachable"
    ],
    "symptoms": [
      "SSH/RDP timeout",
      "Application unreachable"
    ],
    "causes": [
      "Security Group",
      "NACL",
      "Route table",
      "Instance OS firewall",
      "Public IP/DNS issue"
    ],
    "checks": [
      "Check instance status checks",
      "Validate Security Group rules",
      "Validate route table and NACL",
      "Check OS firewall and service"
    ],
    "commands": "aws ec2 describe-instance-status --instance-ids <instance-id>\naws ec2 describe-security-groups --group-ids <sg-id>",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "AWS"
  },
  {
    "id": "aws-ec2-performance",
    "category": "AWS",
    "title": "AWS EC2 performance degradation",
    "keywords": [
      "aws",
      "ec2",
      "performance",
      "degradation"
    ],
    "symptoms": [
      "High latency",
      "High CPU",
      "Slow disk"
    ],
    "causes": [
      "CPU saturation",
      "EBS limits",
      "Memory pressure",
      "Noisy workload"
    ],
    "checks": [
      "Review CloudWatch metrics",
      "Compare before/during incident",
      "Check EBS and network metrics",
      "Inspect guest processes"
    ],
    "commands": "aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=<id>",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "AWS"
  },
  {
    "id": "aws-iam-access",
    "category": "AWS",
    "title": "AWS AccessDenied or IAM permission issue",
    "keywords": [
      "aws",
      "accessdenied",
      "or",
      "iam",
      "permission",
      "issue"
    ],
    "symptoms": [
      "AccessDenied",
      "Unauthorized operation"
    ],
    "causes": [
      "Missing policy",
      "Explicit deny",
      "Wrong role",
      "SCP or permission boundary"
    ],
    "checks": [
      "Identify principal",
      "Review CloudTrail event",
      "Check attached policies",
      "Check explicit denies and boundaries"
    ],
    "commands": "aws sts get-caller-identity\naws iam list-attached-user-policies --user-name <user>",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "AWS"
  },
  {
    "id": "azure-vm-connectivity",
    "category": "Azure",
    "title": "Azure VM application or network connectivity issue",
    "keywords": [
      "azure",
      "vm",
      "application",
      "or",
      "network",
      "connectivity",
      "issue"
    ],
    "symptoms": [
      "Application unreachable",
      "RDP/SSH unavailable",
      "Port timeout"
    ],
    "causes": [
      "Application not listening",
      "NSG rule",
      "Guest firewall",
      "Routing/load balancer issue"
    ],
    "checks": [
      "Test application locally",
      "Test from same VNet",
      "Validate NSG and effective routes",
      "Validate guest firewall and listener"
    ],
    "commands": "az vm show -g <rg> -n <vm>\naz network nic show-effective-nsg -g <rg> -n <nic>",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Azure"
  },
  {
    "id": "azure-vm-performance",
    "category": "Azure",
    "title": "Azure VM performance issue",
    "keywords": [
      "azure",
      "vm",
      "performance",
      "issue"
    ],
    "symptoms": [
      "High CPU",
      "High memory",
      "High disk latency"
    ],
    "causes": [
      "VM sizing",
      "Guest process",
      "Disk bottleneck",
      "Memory pressure"
    ],
    "checks": [
      "Review Azure Monitor metrics",
      "Compare incident timeline",
      "Identify top guest processes",
      "Check disk limits and latency"
    ],
    "commands": "az monitor metrics list --resource <resource-id> --metric \"Percentage CPU\"",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Azure"
  },
  {
    "id": "azure-rbac",
    "category": "Azure",
    "title": "Azure authorization or RBAC issue",
    "keywords": [
      "azure",
      "authorization",
      "or",
      "rbac",
      "issue"
    ],
    "symptoms": [
      "AuthorizationFailed",
      "Forbidden operation"
    ],
    "causes": [
      "Missing role assignment",
      "Wrong scope",
      "Propagation delay",
      "Deny assignment"
    ],
    "checks": [
      "Identify signed-in identity",
      "Check role assignments",
      "Validate resource scope",
      "Review activity logs"
    ],
    "commands": "az account show\naz role assignment list --assignee <principal> --all",
    "logs": [],
    "resolution": [
      "Correct the identified root cause using approved change procedures",
      "Avoid disruptive actions until evidence supports them"
    ],
    "verification": [
      "Re-test the original failure path",
      "Confirm monitoring returns to normal"
    ],
    "platform": "Azure"
  },
  {
    "id": "vmware-datastore-full",
    "category": "Storage",
    "title": "VMware datastore is running out of space",
    "keywords": [
      "datastore full",
      "vmdk",
      "snapshot",
      "storage"
    ],
    "symptoms": [
      "Low free space alarms",
      "VM operations fail or pause"
    ],
    "causes": [
      "Snapshots or orphaned files",
      "Large logs/core files",
      "Unexpected VMDK growth"
    ],
    "checks": [
      "Identify largest files",
      "Check snapshots",
      "Check datastore latency and APD/PDL events"
    ],
    "commands": "vdf -h\nfind /vmfs/volumes/<datastore> -type f -size +10G",
    "logs": "/var/run/log/vmkernel.log",
    "resolution": "Remove only confirmed unnecessary data using approved procedures",
    "verification": "Free space recovers and VM operations succeed",
    "platform": "VMware"
  },
  {
    "id": "vmware-vmotion-fails",
    "category": "vMotion",
    "title": "vMotion migration fails",
    "keywords": [
      "vmotion",
      "migration",
      "network",
      "cpu compatibility"
    ],
    "symptoms": [
      "Migration task fails",
      "VM remains on source host"
    ],
    "causes": [
      "vMotion VMkernel connectivity",
      "CPU compatibility or EVC mismatch",
      "Port group or MTU issue"
    ],
    "checks": [
      "Verify vmkping between vMotion interfaces",
      "Check EVC/CPU compatibility",
      "Review task and vmkernel logs"
    ],
    "commands": "vmkping -I vmkX <destination-vmotion-ip>\nesxcli network ip interface list",
    "logs": "/var/run/log/vmkernel.log",
    "resolution": "Correct the failing network or compatibility condition and retry",
    "verification": "Migration completes successfully",
    "platform": "VMware"
  },
  {
    "id": "vmware-vcenter-service-down",
    "category": "vCenter",
    "title": "vCenter service unavailable or UI not loading",
    "keywords": [
      "vcenter",
      "vpxd",
      "vmon",
      "ui down"
    ],
    "symptoms": [
      "vSphere Client unavailable",
      "Tasks fail"
    ],
    "causes": [
      "vCenter service stopped",
      "Disk partition full",
      "Certificate or database issue"
    ],
    "checks": [
      "Check VAMI/service status",
      "Review vmon and vpxd logs",
      "Check filesystem capacity"
    ],
    "commands": "service-control --status --all\ndf -h",
    "logs": "/var/log/vmware/vmon/vmon.log\n/var/log/vmware/vpxd/vpxd.log",
    "resolution": "Resolve disk/certificate/service root cause before restarting services",
    "verification": "vCenter UI and inventory operations recover",
    "platform": "VMware"
  },
  {
    "id": "windows-disk-space",
    "category": "Storage",
    "title": "Windows Server C: drive is running out of space",
    "keywords": [
      "disk full",
      "c drive full",
      "windows server"
    ],
    "symptoms": [
      "Low disk alerts",
      "Updates or applications fail"
    ],
    "causes": [
      "Logs, temp files or dumps growing",
      "Application data expansion"
    ],
    "checks": [
      "Use Get-Volume",
      "Find large folders/files",
      "Check event logs for recurring failures"
    ],
    "commands": "Get-Volume\nGet-ChildItem C:\\ -Force -ErrorAction SilentlyContinue | Sort Length -Descending | Select -First 20 FullName,Length",
    "logs": "Event Viewer: System; Application",
    "resolution": "Clean confirmed temporary/log data according to retention policy",
    "verification": "Free space remains above operational threshold",
    "platform": "Windows"
  },
  {
    "id": "windows-service-failure",
    "category": "Services",
    "title": "Windows service repeatedly stops or fails to start",
    "keywords": [
      "service failed",
      "windows service"
    ],
    "symptoms": [
      "Application unavailable",
      "Service start failures"
    ],
    "causes": [
      "Dependency failure",
      "Credential issue",
      "Port conflict"
    ],
    "checks": [
      "Check service status and dependencies",
      "Review System/Application events",
      "Check listening port if applicable"
    ],
    "commands": "Get-Service <service>\nGet-WinEvent -LogName System -MaxEvents 50",
    "logs": "Event Viewer: System; Application",
    "resolution": "Fix dependency, account or configuration issue then start service",
    "verification": "Service remains Running and application is healthy",
    "platform": "Windows"
  },
  {
    "id": "windows-dns",
    "category": "Network",
    "title": "Windows Server DNS resolution failure",
    "keywords": [
      "dns",
      "name resolution",
      "nslookup"
    ],
    "symptoms": [
      "Hostname fails but IP works",
      "Application connection failures"
    ],
    "causes": [
      "Wrong DNS server",
      "DNS service/zone issue",
      "Network reachability"
    ],
    "checks": [
      "Check adapter DNS settings",
      "Test nslookup",
      "Check DNS service"
    ],
    "commands": "ipconfig /all\nnslookup <name>\nResolve-DnsName <name>",
    "logs": "Event Viewer: DNS Server; System",
    "resolution": "Correct DNS configuration or server/zone issue",
    "verification": "Forward and reverse lookups succeed",
    "platform": "Windows"
  },
  {
    "id": "linux-disk-full",
    "category": "Storage",
    "title": "Linux filesystem is full",
    "keywords": [
      "linux disk full",
      "no space left"
    ],
    "symptoms": [
      "No space left on device",
      "Services fail to write logs"
    ],
    "causes": [
      "Large logs",
      "Deleted-but-open files",
      "Unexpected data growth"
    ],
    "checks": [
      "Check df and du",
      "Check journal size",
      "Look for deleted open files"
    ],
    "commands": "df -h\ndu -xhd1 / | sort -h\njournalctl --disk-usage",
    "logs": "journalctl; /var/log",
    "resolution": "Remove confirmed unnecessary data and correct growth source",
    "verification": "Filesystem usage stabilizes",
    "platform": "Linux"
  },
  {
    "id": "linux-network",
    "category": "Network",
    "title": "Linux server cannot reach network or DNS",
    "keywords": [
      "linux network",
      "dns",
      "route"
    ],
    "symptoms": [
      "Ping/connectivity failures",
      "Hostname resolution fails"
    ],
    "causes": [
      "Interface down",
      "Bad route",
      "DNS configuration"
    ],
    "checks": [
      "Check IP and link state",
      "Check routes",
      "Test DNS and TCP connectivity"
    ],
    "commands": "ip addr\nip route\nresolvectl status 2>/dev/null || cat /etc/resolv.conf",
    "logs": "journalctl -u NetworkManager; journalctl -k",
    "resolution": "Correct interface, route, DNS or firewall configuration",
    "verification": "Expected gateway, DNS and service tests succeed",
    "platform": "Linux"
  },
  {
    "id": "linux-service",
    "category": "Services",
    "title": "systemd service fails to start",
    "keywords": [
      "systemd",
      "service failed",
      "journalctl"
    ],
    "symptoms": [
      "Unit enters failed state",
      "Application unavailable"
    ],
    "causes": [
      "Bad configuration",
      "Dependency failure",
      "Permission/resource issue"
    ],
    "checks": [
      "Check systemctl status",
      "Read unit journal",
      "Validate configuration"
    ],
    "commands": "systemctl status <service>\njournalctl -u <service> -b",
    "logs": "journalctl",
    "resolution": "Fix root configuration/dependency issue then restart",
    "verification": "Unit remains active and service responds",
    "platform": "Linux"
  },
  {
    "id": "aws-ec2-unreachable",
    "category": "EC2",
    "title": "AWS EC2 instance is unreachable",
    "keywords": [
      "ec2 unreachable",
      "ssh",
      "rdp",
      "security group"
    ],
    "symptoms": [
      "SSH/RDP timeout",
      "Application unreachable"
    ],
    "causes": [
      "Security group/NACL/route issue",
      "Instance health problem",
      "Guest firewall/service issue"
    ],
    "checks": [
      "Check instance status checks",
      "Verify security groups and route tables",
      "Check correct public/private path"
    ],
    "commands": "aws ec2 describe-instance-status --include-all-instances",
    "logs": "CloudWatch; EC2 console status checks",
    "resolution": "Correct network or guest issue identified by checks",
    "verification": "Required TCP connectivity succeeds",
    "platform": "AWS"
  },
  {
    "id": "aws-access-denied",
    "category": "IAM",
    "title": "AWS AccessDenied error",
    "keywords": [
      "accessdenied",
      "iam",
      "permission"
    ],
    "symptoms": [
      "CLI/API operation denied"
    ],
    "causes": [
      "Missing identity policy",
      "Explicit deny",
      "Wrong role/credentials"
    ],
    "checks": [
      "Confirm caller identity",
      "Review policies and permission boundaries",
      "Use CLI debug when needed"
    ],
    "commands": "aws sts get-caller-identity\naws <service> <command> --debug",
    "logs": "CloudTrail; CLI debug output",
    "resolution": "Grant least-privilege permission or use correct role/credentials",
    "verification": "Operation succeeds with intended identity",
    "platform": "AWS"
  },
  {
    "id": "aws-performance",
    "category": "Monitoring",
    "title": "AWS workload performance degradation",
    "keywords": [
      "cloudwatch",
      "cpu",
      "ec2 performance"
    ],
    "symptoms": [
      "High latency",
      "High CPU or network saturation"
    ],
    "causes": [
      "Instance resource pressure",
      "Storage or application bottleneck"
    ],
    "checks": [
      "Review CloudWatch metrics",
      "Check instance type/limits",
      "Correlate guest OS metrics"
    ],
    "commands": "aws cloudwatch list-metrics --namespace AWS/EC2",
    "logs": "CloudWatch",
    "resolution": "Address identified compute, storage, network or application bottleneck",
    "verification": "Metrics and latency return to expected baseline",
    "platform": "AWS"
  },
  {
    "id": "azure-vm-connectivity",
    "category": "Virtual Machines",
    "title": "Azure VM cannot connect to another service",
    "keywords": [
      "azure vm",
      "connectivity",
      "nsg",
      "route"
    ],
    "symptoms": [
      "TCP connection fails",
      "VM cannot reach peer/internet"
    ],
    "causes": [
      "NSG rule",
      "UDR",
      "Guest firewall/DNS",
      "Service not listening"
    ],
    "checks": [
      "Check NIC/subnet NSGs",
      "Check effective routes",
      "Test TCP from VM"
    ],
    "commands": "Test-NetConnection <host> -Port <port>",
    "logs": "Azure Network Watcher; guest logs",
    "resolution": "Correct blocking NSG/UDR/firewall/DNS/listener condition",
    "verification": "TCP test succeeds",
    "platform": "Azure"
  },
  {
    "id": "azure-vm-performance",
    "category": "Virtual Machines",
    "title": "Azure VM performance is slow",
    "keywords": [
      "azure vm slow",
      "cpu",
      "memory",
      "disk"
    ],
    "symptoms": [
      "High response time",
      "High CPU/disk activity"
    ],
    "causes": [
      "VM size limitation",
      "Guest resource pressure",
      "Disk bottleneck"
    ],
    "checks": [
      "Review Azure Monitor metrics",
      "Check guest CPU/memory/disk",
      "Compare with workload baseline"
    ],
    "commands": "Get-AzMetric -ResourceId <resourceId> -MetricName \"Percentage CPU\"",
    "logs": "Azure Monitor",
    "resolution": "Resize/tune only after identifying bottleneck and change approval",
    "verification": "Performance returns to baseline",
    "platform": "Azure"
  },
  {
    "id": "azure-rbac-denied",
    "category": "Identity",
    "title": "Azure authorization or RBAC error",
    "keywords": [
      "azure authorizationfailed",
      "rbac"
    ],
    "symptoms": [
      "AuthorizationFailed",
      "Operation denied"
    ],
    "causes": [
      "Missing role assignment",
      "Wrong scope",
      "Wrong signed-in identity"
    ],
    "checks": [
      "Confirm current account",
      "Review role assignments and scope"
    ],
    "commands": "az account show\naz role assignment list --assignee <principal>",
    "logs": "Azure Activity Log",
    "resolution": "Assign appropriate least-privilege role at correct scope",
    "verification": "Operation succeeds with intended identity",
    "platform": "Azure"
  },
  {
    "id": "cisco-ucs-fabric-interconnect-health",
    "platform": "Cisco UCS",
    "category": "Fabric Interconnects",
    "title": "Cisco UCS Fabric Interconnect Health Check",
    "keywords": [
      "Cisco UCS",
      "Fabric Interconnects",
      "Cisco UCS Fabric Interconnect Health Check"
    ],
    "symptoms": [
      "Fabric Interconnect cluster, uplink and fault health"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Review faults",
      "confirm cluster state",
      "validate uplinks and server ports"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Address the identified connectivity, configuration, firmware or hardware condition under change control"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  },
  {
    "id": "cisco-ucs-service-profile-association",
    "platform": "Cisco UCS",
    "category": "Service Profiles",
    "title": "Cisco UCS Service Profile Association Failure",
    "keywords": [
      "Cisco UCS",
      "Service Profiles",
      "Cisco UCS Service Profile Association Failure"
    ],
    "symptoms": [
      "Service profile association, pools and policy dependencies"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Review association FSM",
      "validate server qualification and identity pools",
      "confirm vNIC and vHBA dependencies"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Correct the failed pool, policy, dependency or qualification condition and retry"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  },
  {
    "id": "cisco-ucs-firmware-upgrade-planning",
    "platform": "Cisco UCS",
    "category": "Firmware",
    "title": "Cisco UCS Firmware Upgrade Planning",
    "keywords": [
      "Cisco UCS",
      "Firmware",
      "Cisco UCS Firmware Upgrade Planning"
    ],
    "symptoms": [
      "Infrastructure and server firmware lifecycle planning"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Record current versions",
      "validate compatibility",
      "review faults and redundancy",
      "back up configuration"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Follow the approved upgrade sequence and validate every stage"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  },
  {
    "id": "cisco-ucs-blade-discovery",
    "platform": "Cisco UCS",
    "category": "Hardware",
    "title": "Cisco UCS Blade Discovery Issue",
    "keywords": [
      "Cisco UCS",
      "Hardware",
      "Cisco UCS Blade Discovery Issue"
    ],
    "symptoms": [
      "Blade absent, stuck in discovery or showing inventory faults"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Review discovery FSM",
      "check chassis, IOM, server power, inventory and both fabrics"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Correct the identified power, seating, connectivity or firmware condition"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  },
  {
    "id": "cisco-ucs-vnic-uplink-connectivity",
    "platform": "Cisco UCS",
    "category": "Networking",
    "title": "Cisco UCS vNIC and Uplink Connectivity",
    "keywords": [
      "Cisco UCS",
      "Networking",
      "Cisco UCS vNIC and Uplink Connectivity"
    ],
    "symptoms": [
      "vNIC, VLAN, uplink, port-channel and fabric pinning"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Validate vNIC state, VLANs, uplinks, port channels and both fabric paths"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Correct the VLAN, uplink, pinning or host configuration mismatch"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  },
  {
    "id": "cisco-ucs-san-boot",
    "platform": "Cisco UCS",
    "category": "SAN / Boot",
    "title": "Cisco UCS SAN Boot Failure",
    "keywords": [
      "Cisco UCS",
      "SAN / Boot",
      "Cisco UCS SAN Boot Failure"
    ],
    "symptoms": [
      "Boot policy, vHBA, WWPN, VSAN, zoning and LUN visibility"
    ],
    "causes": [
      "Configuration mismatch",
      "Connectivity or compatibility issue",
      "Hardware or firmware condition"
    ],
    "checks": [
      "Validate boot order, target and LUN",
      "verify vHBAs, VSANs, zoning and storage masking"
    ],
    "commands": "# Review UCS Manager faults, events, inventory and the relevant FSM before making changes",
    "logs": [
      "UCS Manager faults and events",
      "Relevant FSM details",
      "Tech-support bundle when required"
    ],
    "resolution": [
      "Correct the boot policy, VSAN, zoning, masking or target issue"
    ],
    "verification": [
      "The original fault is cleared",
      "Expected redundant paths and services are healthy"
    ]
  }
];
const SCRIPTS=[
  {
    "title": "Snapshot inventory report",
    "category": "PowerCLI",
    "desc": "Exports VM snapshot information to CSV.",
    "code": "Connect-VIServer <vcenter>\nGet-VM | Get-Snapshot | Select @{N=\"VM\";E={$_.VM.Name}},Name,Created,SizeMB |\n  Export-Csv .\\snapshot-report.csv -NoTypeInformation",
    "platform": "VMware"
  },
  {
    "title": "ESXi host connectivity check",
    "category": "PowerCLI",
    "desc": "Checks connection state and maintenance mode.",
    "code": "Connect-VIServer <vcenter>\nGet-VMHost | Select Name,ConnectionState,PowerState,\n  @{N=\"MaintenanceMode\";E={$_.ConnectionState -eq \"Maintenance\"}}",
    "platform": "VMware"
  },
  {
    "title": "Datastore capacity report",
    "category": "PowerCLI",
    "desc": "Shows capacity and free space for datastores.",
    "code": "Connect-VIServer <vcenter>\nGet-Datastore | Select Name,Type,\n @{N=\"CapacityGB\";E={[math]::Round($_.CapacityGB,2)}},\n @{N=\"FreeGB\";E={[math]::Round($_.FreeSpaceGB,2)}} | Sort FreeGB",
    "platform": "VMware"
  },
  {
    "title": "Windows Server Health Report",
    "category": "Windows",
    "desc": "Collects basic CPU, memory, disk and service health into a CSV report.",
    "code": "Get-CimInstance Win32_OperatingSystem | Select CSName,LastBootUpTime,FreePhysicalMemory,TotalVisibleMemorySize | Export-Csv .\\windows-health.csv -NoTypeInformation\nGet-PSDrive -PSProvider FileSystem | Select Name,Used,Free | Export-Csv .\\windows-disks.csv -NoTypeInformation",
    "platform": "Windows"
  },
  {
    "title": "Top Windows Processes",
    "category": "Windows",
    "desc": "Exports top CPU-consuming processes for quick investigation.",
    "code": "Get-Process | Sort CPU -Descending | Select -First 25 Name,Id,CPU,WS | Export-Csv .\\top-processes.csv -NoTypeInformation",
    "platform": "Windows"
  },
  {
    "title": "Linux Health Snapshot",
    "category": "Linux",
    "desc": "Collects a safe point-in-time Linux health snapshot.",
    "code": "#!/bin/bash\necho \"=== UPTIME ===\"; uptime\necho \"=== DISK ===\"; df -h\necho \"=== MEMORY ===\"; free -h\necho \"=== TOP PROCESSES ===\"; ps -eo pid,ppid,comm,%cpu,%mem --sort=-%cpu | head -20",
    "platform": "Linux"
  },
  {
    "title": "Linux Disk Usage Report",
    "category": "Linux",
    "desc": "Lists the largest directories and files under a selected path.",
    "code": "#!/bin/bash\nTARGET=${1:-/var}\ndu -xhd1 \"$TARGET\" 2>/dev/null | sort -h\nfind \"$TARGET\" -xdev -type f -printf \"%s %p\\n\" 2>/dev/null | sort -n | tail -20",
    "platform": "Linux"
  },
  {
    "title": "AWS EC2 Status Report",
    "category": "AWS",
    "desc": "Lists EC2 instance state and key metadata using AWS CLI.",
    "code": "aws ec2 describe-instances --query \"Reservations[].Instances[].{Name:Tags[?Key==`Name`]|[0].Value,InstanceId:InstanceId,State:State.Name,Type:InstanceType,PrivateIP:PrivateIpAddress}\" --output table",
    "platform": "AWS"
  },
  {
    "title": "AWS Identity Check",
    "category": "AWS",
    "desc": "Confirms which AWS identity is being used before troubleshooting permissions.",
    "code": "aws sts get-caller-identity",
    "platform": "AWS"
  },
  {
    "title": "Azure VM Inventory",
    "category": "Azure",
    "desc": "Lists VMs and their power state.",
    "code": "az vm list -d --query \"[].{Name:name,ResourceGroup:resourceGroup,Power:powerState,PrivateIPs:privateIps,PublicIPs:publicIps}\" -o table",
    "platform": "Azure"
  },
  {
    "title": "Azure Role Assignment Check",
    "category": "Azure",
    "desc": "Lists role assignments for a principal.",
    "code": "az role assignment list --assignee <principal-id-or-upn> --all -o table",
    "platform": "Azure"
  },
  {
    "title": "VMware host quick health report",
    "category": "PowerCLI",
    "desc": "Collects basic ESXi connection and version information.",
    "code": "Connect-VIServer <vcenter>\nGet-VMHost | Select Name,Version,Build,ConnectionState,PowerState | Export-Csv .\\vmware-host-health.csv -NoTypeInformation",
    "platform": "VMware"
  },
  {
    "title": "Windows server quick health report",
    "category": "PowerShell",
    "desc": "Collects CPU, memory and volume information.",
    "code": "Get-CimInstance Win32_OperatingSystem | Select CSName,FreePhysicalMemory,TotalVisibleMemorySize\nGet-Volume | Select DriveLetter,FileSystemLabel,SizeRemaining,Size",
    "platform": "Windows"
  },
  {
    "title": "Linux system triage snapshot",
    "category": "Bash",
    "desc": "Captures basic resource, filesystem and service-failure information.",
    "code": "#!/bin/bash\nhostnamectl\nuptime\ndf -h\nfree -h\nsystemctl --failed",
    "platform": "Linux"
  },
  {
    "title": "AWS EC2 status report",
    "category": "AWS CLI",
    "desc": "Lists EC2 instances with state and basic placement information.",
    "code": "aws ec2 describe-instances --query \"Reservations[].Instances[].{Name:Tags[?Key==`Name`]|[0].Value,State:State.Name,Type:InstanceType,AZ:Placement.AvailabilityZone}\" --output table",
    "platform": "AWS"
  },
  {
    "title": "Azure VM inventory report",
    "category": "Azure CLI",
    "desc": "Lists Azure VMs and power state.",
    "code": "az vm list -d --query \"[].{Name:name,RG:resourceGroup,Location:location,Power:powerState}\" -o table",
    "platform": "Azure"
  }
];
const COMMANDS=[
  {
    "name": "Check ESXi storage filesystems",
    "category": "ESXi / Storage",
    "cmd": "esxcli storage filesystem list",
    "use": "Lists mounted filesystems and accessibility.",
    "platform": "VMware"
  },
  {
    "name": "Check ESXi storage paths",
    "category": "ESXi / Storage",
    "cmd": "esxcli storage core path list",
    "use": "Review active/dead path states.",
    "platform": "VMware"
  },
  {
    "name": "View vCenter services",
    "category": "vCenter",
    "cmd": "service-control --status --all",
    "use": "Checks appliance service state.",
    "platform": "VMware"
  },
  {
    "name": "Find disk usage",
    "category": "vCenter / Linux",
    "cmd": "df -h",
    "use": "Shows filesystem capacity and utilization.",
    "platform": "VMware"
  },
  {
    "name": "ESXi VMkernel connectivity test",
    "category": "Networking",
    "cmd": "vmkping -I vmkX <destination-ip>",
    "use": "Tests a specific VMkernel path.",
    "platform": "VMware"
  },
  {
    "name": "Jumbo-frame vMotion test",
    "category": "Networking",
    "cmd": "vmkping -I vmkX -d -s 8972 <destination-ip>",
    "use": "Tests large packet connectivity where supported/configured.",
    "platform": "VMware"
  },
  {
    "name": "List VM snapshots with PowerCLI",
    "category": "PowerCLI",
    "cmd": "Get-VM | Get-Snapshot | Select VM,Name,Created,SizeMB",
    "use": "Quick snapshot inventory.",
    "platform": "VMware"
  },
  {
    "name": "Check certificate stores",
    "category": "Certificates",
    "cmd": "vecs-cli store list",
    "use": "Lists VECS stores on vCenter Appliance.",
    "platform": "VMware"
  },
  {
    "name": "Check Windows listening ports",
    "category": "Windows / Network",
    "cmd": "Get-NetTCPConnection -State Listen",
    "use": "Lists listening TCP ports and owning processes.",
    "platform": "Windows"
  },
  {
    "name": "Check Windows recent errors",
    "category": "Windows / Logs",
    "cmd": "Get-WinEvent -FilterHashtable @{LogName=\"System\";Level=2;StartTime=(Get-Date).AddHours(-24)} -MaxEvents 50",
    "use": "Shows recent System log errors.",
    "platform": "Windows"
  },
  {
    "name": "Check Linux service status",
    "category": "Linux / Services",
    "cmd": "systemctl --failed",
    "use": "Lists failed systemd services.",
    "platform": "Linux"
  },
  {
    "name": "Check Linux disk usage",
    "category": "Linux / Storage",
    "cmd": "df -h",
    "use": "Shows filesystem capacity and free space.",
    "platform": "Linux"
  },
  {
    "name": "Check AWS caller identity",
    "category": "AWS / IAM",
    "cmd": "aws sts get-caller-identity",
    "use": "Confirms the active AWS identity.",
    "platform": "AWS"
  },
  {
    "name": "Check Azure account",
    "category": "Azure / Identity",
    "cmd": "az account show",
    "use": "Shows the active Azure subscription and tenant context.",
    "platform": "Azure"
  }
];
const RESOURCES=[];
const LOG_MAP=[
  [
    "hostd.log",
    "ESXi host management service and VM/host operations"
  ],
  [
    "vpxa.log",
    "vCenter agent communication on ESXi"
  ],
  [
    "vmkernel.log",
    "Core ESXi storage, networking, device and VM events"
  ],
  [
    "fdm.log",
    "vSphere HA / FDM events"
  ],
  [
    "vpxd.log",
    "Main vCenter Server operations and tasks"
  ],
  [
    "vmon.log",
    "vCenter service lifecycle and supervisor events"
  ]
];
window.KB_ARTICLES=KB_ARTICLES;window.SCRIPTS=SCRIPTS;window.COMMANDS=COMMANDS;window.RESOURCES=RESOURCES;window.LOG_MAP=LOG_MAP;window.SYSADMINIQ_DATA_VERSION="4.2.0";
