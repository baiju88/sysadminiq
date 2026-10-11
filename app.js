/**
 * SysAdminIQ Knowledge Base & Troubleshooting Portal
 * Production APP.JS
 * 
 * Features:
 * - 0ms instant loading with self-contained built-in databases (Articles, Commands, Scripts, Resources, Logs)
 * - Safe background sync with Cloudflare D1 API (credentials: 'include' & timeout controller)
 * - Full Navigation & Search across Knowledge Base, Analyzer, Logs, Commands, Scripts, Resources
 * - Clean Article View (Publishing, Editing, and Deletion exclusive to publisher.html / publish.html)
 * - Seamless link to publisher.html with Cloudflare Zero Trust authentication
 * - Rich diagnostic articles including VMware vCenter STS Certificate, Azure Boot Recovery, and UCS playbooks
 */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let DB = { articles: [], scripts: [], commands: [], resources: [], log_map: [] };
let currentCase = null;
let adminType = 'articles';
let editingId = null;
let BACKEND_ONLINE = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

const arr = v => Array.isArray(v) ? v : (v ? String(v).split(/\n|\r\n/).map(x => x.trim()).filter(Boolean) : []);

const LOCAL_KEY = 'sysAdminIQKB_v420';
const LEGACY_KEY = 'vmwareTroubleshootingKB_v23';
const PREVIOUS_KEY = 'systemAdminTroubleshootingKB_v25';
const OLDER_KEY = 'systemAdminTroubleshootingKB_v24';
const AUTH_STORAGE_KEY = 'sysadminiq_auth_key';
const LEGACY_AUTH_KEY = 'sysadminiq_publisher_token';
const CF_TOKEN_KEY = 'cf_api_token';

const MAIN_CATEGORIES = [
  { name: 'VMware', short: 'VM', desc: 'vSphere, ESXi, vCenter, VCF, storage and networking' },
  { name: 'Windows', short: 'W', desc: 'Windows Server, services, events, AD and PowerShell' },
  { name: 'Linux', short: 'L', desc: 'Linux systems, services, storage, networking and shell' },
  { name: 'AWS', short: 'A', desc: 'EC2, EBS, VPC, IAM, CloudWatch and AWS CLI' },
  { name: 'Azure', short: 'AZ', desc: 'VMs, networking, storage, identity and Azure CLI' },
  { name: 'Cisco UCS', short: 'UCS', desc: 'Fabric Interconnects, blades, service profiles, firmware, LAN and SAN' }
];

const BUILTIN_ARTICLES = [
  {
    id: "vmw-vds-out-of-sync-isolation",
    platform: "VMware",
    category: "Networking & vDS",
    title: "vSphere Distributed Switch (vDS) Out of Sync and Host Network Isolation",
    keywords: ["vds", "distributed switch", "out of sync", "rectify", "rollback", "jumbo frames", "mtu 9000", "network isolation"],
    symptoms: [
      "ESXi host displays warning: 'The vSphere Distributed Switch configuration on host does not match configuration in vCenter Server'",
      "Host network isolation or disconnected state following MTU 9000 or VLAN trunking reconfiguration",
      "Network rollback timer triggered on vSphere Distributed Switch host proxy switch (dvsData.db)"
    ],
    causes: [
      "Physical switch port MTU mismatch: ToR switch ports configured at default MTU 1500 while vDS vmkernel is set to MTU 9000",
      "vCenter Server task timeout or hostd communication drop during distributed virtual switch push",
      "Uplink teaming policy mismatch (e.g., LACP or IP-hash enabled on vDS without matching LAG configured on upstream switch)"
    ],
    checks: [
      "Verify host proxy switch configuration via SSH: 'esxcli network vswitch dvs vmware list'",
      "Test end-to-end unfragmented packet delivery: 'vmkping -d -s 8972 -I vmk0 <Gateway_IP>'",
      "Review /var/log/hostd.log and /var/log/vpxd.log for DVS synchronization exceptions"
    ],
    commands: "esxcli network vswitch dvs vmware list\nesxcfg-vswitch -l\nvmkping -d -s 8972 -I vmk0 <Gateway_IP>\nesxcli network nic list",
    logs: [
      "/var/log/hostd.log - Look for 'DVS proxy switch sync failed' or 'dvsData.db read/write timeout'",
      "/var/log/vmkernel.log - Check for frame size exceeded or dropped packets on vmnic uplinks",
      "/var/log/vpxd.log - Task 'Reconfigure distributed virtual switch' rollback events"
    ],
    resolution: [
      "If host is isolated: access Direct Console User Interface (DCUI), navigate to 'Network Restore Options' and select 'Restore Standard Switch' to recover vmk0",
      "Ensure physical switch uplinks support MTU >= 9216 before setting vDS or vmkernel MTU to 9000",
      "In vSphere Client: go to Networking -> vDS -> Hosts tab, right-click the out-of-sync host, and select 'Rectify' to push the vCenter configuration to the host",
      "Verify uplink teaming policy matches upstream switch port-channel configuration"
    ],
    verification: [
      "Confirm host status on vDS displays 'In Sync' in vSphere Client",
      "Execute 'vmkping -d -s 8972 <target>' and verify 0% packet loss",
      "Verify host management connectivity is green and VMs pass traffic without packet drops"
    ]
  },
  {
    id: "vmw-esxi-psod-pf-exception-14",
    platform: "VMware",
    category: "ESXi Core",
    title: "ESXi Purple Screen of Death (PSOD): Exception 14 Page Fault in vmkernel",
    keywords: ["psod", "exception 14", "page fault", "vmkernel", "crash", "core dump"],
    symptoms: [
      "ESXi host abruptly stops responding and displays purple diagnostic screen",
      "Backtrace references Exception 14 (#PF: Page Fault) in world id or vmkpcpu",
      "Virtual machines on host trigger vSphere HA failover to surviving hosts"
    ],
    causes: [
      "Hardware memory parity error or DIMM uncorrectable ECC error",
      "Outdated or defective network/storage driver (e.g., qfle3, ixgben, native nvme)",
      "Corrupted memory page referenced by active kernel module or microcode defect"
    ],
    checks: [
      "Review IPMI / iLO / iDRAC system event logs for hardware RAM or PCIe bus errors",
      "Check ESXi coredump partition using esxcli system coredump file get",
      "Verify driver firmware compatibility with VMware Compatibility Guide (HCL)"
    ],
    commands: "esxcli system coredump partition get\nesxcli system coredump file get\nesxcli software vib list | grep -E 'qfle|ixgben|lpfc|qlnativefc'\nesxcli hardware cpu global get",
    logs: [
      "/var/log/vmkernel.log - Look for MCE (Machine Check Exceptions) prior to panic",
      "/var/log/vobd.log - VOB events reporting hardware degradation or driver timeouts",
      "vm-support bundle extract: check 'panics' or 'backtrace.txt'"
    ],
    resolution: [
      "Capture the PSOD screen photo including backtrace and register values",
      "Reboot server into hardware diagnostics to stress test DIMM channels",
      "Update server BIOS/UEFI and CPU microcode to latest vendor certified level",
      "Upgrade async network/HBA storage controller drivers using esxcli software vib update"
    ],
    verification: [
      "Confirm host boots cleanly without purple screen",
      "Execute 'esxcli system coredump file list' to ensure core dump was written to disk",
      "Verify host uptime and monitor system health sensors in vSphere Client for 48 hours"
    ]
  },
  {
    id: "vmw-vcenter-sts-cert-expired",
    platform: "VMware",
    category: "vCenter & SSO Security",
    title: "vCenter Server STS Signing Certificate Expired: SSO 503 Service Unavailable and VMware Identity Failure",
    keywords: ["sts", "certificate expired", "signing certificate", "sso", "503 service unavailable", "identity service", "checksts.py", "fixsts.sh"],
    symptoms: [
      "vSphere Client login fails with '503 Service Unavailable: Failed to connect to endpoint: https://localhost:10080/invsvc'",
      "Users cannot authenticate via SSO: 'Signing certificate is not valid' or 'IDM service failed'",
      "vpxd fails to start with error: 'Cannot connect to SSO server [https://vcenter.domain.local/sts/STSService]'"
    ],
    causes: [
      "The Security Token Service (STS) signing certificate has expired (default 2-year or 10-year validity)",
      "Root CA or machine SSL certificates were renewed without renewing the underlying STS signing certificate chain",
      "Time desynchronization between ESXi NTP and vCenter Appliance VMAFD service"
    ],
    checks: [
      "SSH to vCenter Appliance and check STS certificate validity using checksts.py utility",
      "Run: '/usr/lib/vmware-vmafd/bin/vecs-cli entry list --store TRUSTED_ROOT_CRLS --text'",
      "Verify appliance time sync: 'ntpstat' or 'chronyc tracking'"
    ],
    commands: "python /root/checksts.py\n/usr/lib/vmware-vmafd/bin/vecs-cli entry list --store TRUSTED_ROOTS --text | grep -A 2 'Not After'\nservice-control --status\n./fixsts.sh\nservice-control --stop --all && service-control --start --all",
    logs: [
      "/var/log/vmware/sso/ssoAdminServer.log - Look for 'CertificateExpiredException' or 'The security token certificate is expired'",
      "/var/log/vmware/vpxd/vpxd.log - Look for 'Failed to initialize SSO client'",
      "/var/log/vmware/vmon/vmon.log - Service lifecycle failure on vmware-vpxd"
    ],
    resolution: [
      "Take a cold offline snapshot of the vCenter Server Appliance (VCSA) prior to modifications",
      "Download VMware KB utility 'fixsts.sh' to /root on the vCenter Server Appliance",
      "Make the script executable: 'chmod +x fixsts.sh'",
      "Run './fixsts.sh' and provide the Single Sign-On administrator password (administrator@vsphere.local)",
      "Restart all vCenter services: 'service-control --stop --all && service-control --start --all'",
      "Verify all services report running and test web client authentication"
    ],
    verification: [
      "Re-run 'python checksts.py' and verify all certificates report status 'VALID'",
      "Log in to vSphere Client (https://<vcenter-fqdn>) with SSO credentials without 503 errors",
      "Delete temporary offline snapshot once system stability is verified"
    ]
  },
  {
    id: "win-ad-rpc-1722-replication",
    platform: "Windows",
    category: "Active Directory",
    title: "Active Directory Replication Error 1722: The RPC Server is Unavailable",
    keywords: ["active directory", "rpc 1722", "replication", "repadmin", "dcdiag", "domain controller"],
    symptoms: [
      "repadmin /showrepl reports: 'The RPC server is unavailable (1722)'",
      "Event ID 1925 or 1722 in Directory Service log",
      "Changes made on one Domain Controller do not sync to replication partners"
    ],
    causes: [
      "DNS resolution failure: Partner DC hostname failing to resolve or pointing to stale IP",
      "Network firewall blocking RPC high ports (49152-65535) or port 135",
      "RPC or Remote Procedure Call Locator service stopped on destination DC"
    ],
    checks: [
      "Run 'repadmin /showrepl * /csv > repl.csv' to map all failing replication links",
      "Test DNS resolution with 'nslookup _msdcs.yourdomain.local'",
      "Test RPC port connectivity with 'Test-NetConnection -ComputerName TargetDC -Port 135'"
    ],
    commands: "repadmin /showrepl\nrepadmin /replsummary\ndcdiag /test:dns /v\nTest-NetConnection -ComputerName DC02 -Port 135\nGet-Service RpcSs, DnsCache",
    logs: [
      "Event Viewer -> Applications and Services Logs -> Directory Service (Event ID 1925, 1722)",
      "System Event Log: Netlogon warnings or Kerberos errors (Event ID 5719)"
    ],
    resolution: [
      "Flush and register DNS on both Domain Controllers: 'ipconfig /flushdns' & 'ipconfig /registerdns'",
      "Verify Windows Defender Firewall or hardware network firewall rules allow TCP 135 + dynamic RPC ports",
      "Ensure primary DNS points to partner DC and secondary points to local 127.0.0.1",
      "Force replication trigger: 'repadmin /syncall /AdeP'"
    ],
    verification: [
      "Run 'repadmin /showrepl' and confirm 'successful replication' timestamp is updated",
      "Verify 'repadmin /replsummary' reports 0 failures across all naming contexts"
    ]
  },
  {
    id: "lnx-systemd-disk-space-inode-exhaustion",
    platform: "Linux",
    category: "Storage & Filesystems",
    title: "Linux Filesystem 'No Space Left on Device' Caused by Inode Exhaustion",
    keywords: ["linux", "df -i", "inode exhaustion", "no space left", "ext4", "xfs"],
    symptoms: [
      "Application crashes with 'No space left on device' write error",
      "Running 'df -h' shows ample free disk gigabytes remaining (e.g. 50% free)",
      "Creating a new file with 'touch test.txt' fails immediately"
    ],
    causes: [
      "Filesystem ran out of allocated inodes due to millions of micro-files or sessions",
      "Common culprits: unpurged /var/spool/postfix mail queues or php session temp files",
      "High volume log rotation creating endless small files in /var/log"
    ],
    checks: [
      "Check inode allocation with 'df -i'",
      "Identify directory tree consuming millions of inodes with find command count",
      "Check deleted files held open by active processes using lsof"
    ],
    commands: "df -i\ndf -h\nfind / -xdev -printf '%h\\n' | sort | uniq -c | sort -k 1 -n | tail -20\nlsof | grep '(deleted)' | head -20",
    logs: [
      "/var/log/syslog or /var/log/messages: 'EXT4-fs error' or 'Out of free inodes'",
      "dmesg | grep -i inode"
    ],
    resolution: [
      "Locate the offending directory (e.g., /var/spool/clientmqueue or /tmp)",
      "Safely purge millions of orphaned files using: find /path -type f -name '*.tmp' -delete",
      "Kill lingering processes holding deleted file descriptors: kill -9 <PID>",
      "Configure automated cron job / logrotate to prevent re-accumulation"
    ],
    verification: [
      "Run 'df -i' to confirm IUse% dropped below 60%",
      "Run 'touch /tmp/verify.tmp && rm /tmp/verify.tmp' to verify write capability"
    ]
  },
  {
    id: "az-vm-serial-console-grub-rescue",
    platform: "Azure",
    category: "Virtual Machines & OS Boot",
    title: "Azure Linux VM Boot Failure: Kernel Panic and GRUB Recovery via Serial Console",
    keywords: ["azure", "serial console", "grub rescue", "boot failure", "kernel panic", "vhd"],
    symptoms: [
      "Azure portal shows VM status 'Running' but SSH connection times out on port 22",
      "Azure Boot Diagnostics screenshot shows 'Kernel panic - not syncing: VFS: Unable to mount root fs' or 'grub rescue>'",
      "Serial console displays dracut-initqueue timeout on UUID mounting"
    ],
    causes: [
      "Kernel update generated an initramfs missing Hyper-V storage drivers (hv_vmbus, hv_storvsc)",
      "Corrupted /etc/fstab entry with invalid filesystem UUID after disk resizing",
      "GRUB configuration pointing to deprecated kernel argument or missing root device"
    ],
    checks: [
      "Open Azure Portal -> Virtual Machine -> Help -> Serial Console",
      "Review Boot Diagnostics serial log for dracut or GRUB errors",
      "Check Azure Resource Health for underlying compute platform maintenance"
    ],
    commands: "az vm boot-diagnostics get-boot-log --resource-group rg-infra --name vm-app01\nls -l /dev/disk/by-uuid/\ndracut -f -v --regenerate-all\ngrub2-mkconfig -o /boot/grub2/grub.cfg",
    logs: [
      "Azure Serial Console Output - Kernel boot log and systemd emergency shell",
      "dracut-initqueue [warning]: dracut-initqueue timeout - starting timeout scripts"
    ],
    resolution: [
      "In Azure Serial Console, reboot VM and interrupt GRUB menu by pressing arrow keys",
      "Select previous working kernel and press Enter to boot system successfully",
      "Once logged in, regenerate initramfs including Hyper-V storage drivers: 'dracut -f -v --regenerate-all'",
      "Verify /etc/fstab uses UUID instead of /dev/sd* device paths",
      "Regenerate GRUB: 'grub2-mkconfig -o /boot/grub2/grub.cfg'"
    ],
    verification: [
      "Reboot VM from CLI and verify it boots automatically into newest kernel",
      "Test SSH connectivity over network and verify Azure Boot Diagnostics screenshot shows login prompt"
    ]
  },
  {
    id: "aws-ec2-unreachable-network-interface-route",
    platform: "AWS",
    category: "EC2 & VPC",
    title: "EC2 Instance Unreachable via SSH/RDP: 1/2 Status Check Failure",
    keywords: ["aws", "ec2", "status check failed", "instance check", "security group", "route table"],
    symptoms: [
      "AWS Console shows 1/2 checks passed (Instance status check failed)",
      "Cannot connect to instance via SSH, RDP, or AWS Systems Manager Session Manager",
      "Ping/telnet to public or private IP times out"
    ],
    causes: [
      "Kernel panic, network configuration corruption, or invalid static IP configured inside OS",
      "Exhausted root EBS storage volume preventing boot completion",
      "Network ACL or Route Table missing route to Internet Gateway (0.0.0.0/0 -> igw)"
    ],
    checks: [
      "Check EC2 Instance System Log and Instance Screenshot from EC2 console",
      "Review attached Security Group inbound rules and VPC Route Table associations",
      "Verify CloudWatch CPU Utilization and EBS disk metrics"
    ],
    commands: "aws ec2 get-console-output --instance-id i-0123456789abcdef0\naws ec2 get-console-screenshot --instance-id i-0123456789abcdef0\naws ec2 describe-instance-status --instance-ids i-0123456789abcdef0",
    logs: [
      "EC2 System Console Log - check for Grub failures, cloud-init syntax errors, or kernel panic",
      "VPC Flow Logs - look for REJECT packets on target port"
    ],
    resolution: [
      "If operating system is halted, reboot instance or perform stop/start to migrate to healthy hardware host",
      "If root volume is 100% full, create EBS snapshot, expand volume size in console, and grow partition",
      "If misconfigured firewall/SSH config: detach root volume, attach to rescue EC2 instance, repair file, reattach"
    ],
    verification: [
      "Verify EC2 console reports '2/2 checks passed'",
      "Connect successfully via AWS Systems Manager Session Manager or SSH"
    ]
  },
  {
    id: "ucs-cisco-blade-vnic-path-failure",
    platform: "Cisco UCS",
    category: "Fabric Interconnect",
    title: "Cisco UCS Blade Server vNIC Link State Down: Fabric A/B Uplink Disconnected",
    keywords: ["cisco ucs", "fabric interconnect", "vnic", "vcon", "chassis", "fex"],
    symptoms: [
      "ESXi or OS reports vmnic uplink disconnected or packet drop on Fabric A",
      "UCS Manager alerts with 'Equipment Inoperable' or 'Server Interface Link Down'",
      "Service profile reports degraded redundancy"
    ],
    causes: [
      "SFP+ transceiver fault on Fabric Interconnect or upstream Nexus switch",
      "FEX (Fabric Extender / IOM) link down or mis-pinned port-channel",
      "VIF (Virtual Interface) failover timeout caused by firmware mismatch"
    ],
    checks: [
      "SSH to Fabric Interconnect (UCSM CLI) and run 'show server adapter'",
      "Verify physical port link state: 'show interface brief' in nx-os mode",
      "Check SFP digital diagnostics: 'show interface transceiver details'"
    ],
    commands: "connect nxos a\nshow interface brief | grep Eth\nshow interface transceiver details\nconnect ucs-mgr\nshow fault severity critical",
    logs: [
      "UCS Manager Fault Console: F0276 - fabric-interconnect-port-failed",
      "System Event Log (SEL) for the affected chassis and blade slot"
    ],
    resolution: [
      "Inspect optical power levels on SFP+ modules; clean or replace dirty fiber patches",
      "Re-acknowledge the affected chassis or IOM in UCS Manager to reset path negotiation",
      "Ensure Fabric Interconnect uplink port-channel matches upstream switch LACP configuration",
      "Verify vNIC failover policy settings in UCS Service Profile"
    ],
    verification: [
      "Confirm UCS Manager alerts clear from Critical/Major to Normal",
      "Verify all vNIC interfaces in OS report link speed 10Gbps/25Gbps active"
    ]
  }
];

const BUILTIN_COMMANDS = [
  {
    id: "cmd-1",
    name: "ESXi: Check Host Hardware & Sensors",
    platform: "VMware",
    category: "Hardware Diagnostics",
    use: "Displays detailed CPU, memory, power supply, and temperature sensor readouts from CIM/IPMI",
    cmd: "esxcli hardware cpu global get\nesxcli hardware memory get\nesxcli hardware platform get"
  },
  {
    id: "cmd-2",
    name: "ESXi: Inspect Physical NIC Link & Drivers",
    platform: "VMware",
    category: "Networking",
    use: "Lists all physical vmnics, MAC addresses, link state, speed, duplex, and driver module in use",
    cmd: "esxcli network nic list\nesxcli network nic get -n vmnic0"
  },
  {
    id: "cmd-3",
    name: "ESXi: Check Storage Paths & All Paths Down (APD)",
    platform: "VMware",
    category: "Storage",
    use: "Lists multipathing status, active storage paths, and timeouts",
    cmd: "esxcli storage core path list\nesxcli storage core device list\nesxcli storage nfs list"
  },
  {
    id: "cmd-4",
    name: "Windows: AD Replication Summary",
    platform: "Windows",
    category: "Active Directory",
    use: "Quick overview of replication health across all domain controllers in the forest",
    cmd: "repadmin /replsummary\nrepadmin /showrepl * /csv"
  },
  {
    id: "cmd-5",
    name: "Windows: Test Port Connectivity via PowerShell",
    platform: "Windows",
    category: "Networking",
    use: "Modern replacement for telnet to test TCP connection to remote services",
    cmd: "Test-NetConnection -ComputerName remote-host.domain.local -Port 443 -InformationLevel Detailed"
  },
  {
    id: "cmd-6",
    name: "Linux: Find Top Inode-Consuming Directories",
    platform: "Linux",
    category: "Storage",
    use: "Finds directories with highest number of files to resolve inode exhaustion",
    cmd: "find / -xdev -printf '%h\\n' | sort | uniq -c | sort -k 1 -n | tail -25"
  },
  {
    id: "cmd-7",
    name: "Linux: Real-Time Network Socket Connections",
    platform: "Linux",
    category: "Networking",
    use: "Displays all listening ports, established connections, and corresponding process IDs",
    cmd: "ss -tulpn\nss -s"
  },
  {
    id: "cmd-8",
    name: "AWS: Query EC2 System Log via CLI",
    platform: "AWS",
    category: "Cloud Compute",
    use: "Fetches operating system console output directly from the hypervisor",
    cmd: "aws ec2 get-console-output --instance-id i-0123456789abcdef0 --output text"
  }
];

const BUILTIN_SCRIPTS = [
  {
    id: "scr-1",
    title: "Audit All VMs with Snapshots Older than 7 Days",
    platform: "VMware",
    category: "PowerCLI",
    desc: "Connects to vCenter, finds stale VM snapshots causing storage degradation, and exports to CSV.",
    code: `# PowerCLI: Audit snapshots older than 7 days
Connect-VIServer -Server "vcenter.corp.local" -Credential (Get-Credential)

$ThresholdDate = (Get-Date).AddDays(-7)
$StaleSnapshots = Get-VM | Get-Snapshot | Where-Object { $_.Created -lt $ThresholdDate }

$StaleSnapshots | Select-Object @{N="VM";E={$_.VM.Name}},
                                Name,
                                Created,
                                @{N="SizeGB";E={[math]::Round($_.SizeGB, 2)}},
                                Description |
    Export-Csv -Path "C:\\Reports\\StaleSnapshots.csv" -NoTypeInformation

Write-Host "Found $($StaleSnapshots.Count) stale snapshots. Report saved." -ForegroundColor Green`
  },
  {
    id: "scr-2",
    title: "Automated ESXi Scratch Partition & Coredump Verification",
    platform: "VMware",
    category: "PowerCLI",
    desc: "Validates that all ESXi hosts in a cluster have valid persistent scratch directories and active coredump targets configured.",
    code: `# PowerCLI: Verify coredump & scratch setup
Get-VMHost | ForEach-Object {
    $esx = $_
    $esxcli = Get-EsxCli -VMHost $esx -V2
    $dump = $esxcli.system.coredump.partition.get.Invoke()
    $scratch = (Get-VMHostAdvancedConfiguration -VMHost $esx -Name "UserVars.ScratchLocation")["UserVars.ScratchLocation"]

    [PSCustomObject]@{
        HostName       = $esx.Name
        Version        = $esx.Version
        Build          = $esx.Build
        ScratchPath    = $scratch
        DumpActive     = $dump.Active
        DumpConfigured = $dump.Configured
    }
} | Format-Table -AutoSize`
  },
  {
    id: "scr-3",
    title: "Windows Server: Check Inactive AD Accounts (90+ Days)",
    platform: "Windows",
    category: "PowerShell",
    desc: "Queries Active Directory for stale user accounts that haven't authenticated in 90 days for compliance audits.",
    code: `# PowerShell: Find stale active directory users
Import-Module ActiveDirectory
$Cutoff = (Get-Date).AddDays(-90)

Get-ADUser -Filter {Enabled -eq $true -and LastLogonDate -lt $Cutoff} -Properties LastLogonDate, mail, Title, Department |
    Select-Object SamAccountName, Name, mail, LastLogonDate, Department |
    Sort-Object LastLogonDate |
    Export-Csv -Path "C:\\Security\\InactiveUsers.csv" -NoTypeInformation`
  },
  {
    id: "scr-4",
    title: "Linux: Memory & Zombie Process Watchdog Bash Script",
    platform: "Linux",
    category: "Bash",
    desc: "Checks for high memory usage, runaway swap, and defunct/zombie processes, logging warnings to syslog.",
    code: `#!/bin/bash
# Linux System Watchdog
THRESHOLD_MEM=85
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100}')
ZOMBIES=$(ps aux | awk '$8=="Z" {print $0}' | wc -l)

if [ "$MEM_USAGE" -gt "$THRESHOLD_MEM" ]; then
    logger -t WATCHDOG "CRITICAL: Memory usage is at \${MEM_USAGE}% (Threshold: \${THRESHOLD_MEM}%)"
fi

if [ "$ZOMBIES" -gt 0 ]; then
    logger -t WATCHDOG "WARNING: Detected \${ZOMBIES} zombie processes on $(hostname)"
fi`
  }
];

const BUILTIN_RESOURCES = [
  {
    id: "res-1",
    name: "VMware Compatibility Guide (HCL)",
    platform: "VMware",
    category: "Compatibility",
    url: "https://www.vmware.com/resources/compatibility/search.php",
    description: "Official hardware compatibility list for servers, storage, IO cards, and ESXi releases.",
    notes: "Always check driver/firmware combos before updating ESXi builds."
  },
  {
    id: "res-2",
    name: "Broadcom VMware Knowledge Base",
    platform: "VMware",
    category: "Documentation",
    url: "https://knowledge.broadcom.com/external/article",
    description: "Official Broadcom / VMware support portal for knowledge articles and bulletins.",
    notes: "Search by KB number or exact error string."
  },
  {
    id: "res-3",
    name: "Microsoft Sysinternals Suite",
    platform: "Windows",
    category: "Troubleshooting Tools",
    url: "https://learn.microsoft.com/en-us/sysinternals/",
    description: "Essential utilities including Process Explorer, Process Monitor, and TCPView for Windows deep-dive.",
    notes: "Can be executed live via live.sysinternals.com."
  },
  {
    id: "res-4",
    name: "Linux Performance Observability (Brendan Gregg)",
    platform: "Linux",
    category: "Performance Analysis",
    url: "https://www.brendangregg.com/linuxperf.html",
    description: "Comprehensive diagrams and methodologies for CPU, memory, disk, and network profiling tools.",
    notes: "Standard reference for sysadmins diagnosing system bottlenecks."
  }
];

const BUILTIN_LOG_MAP = [
  ["vpxd.log", "vCenter Server main management service. Connection errors, database queries, DRS/HA logic."],
  ["hostd.log", "ESXi host management daemon. Virtual machine lifecycle, storage volume discovery, vSphere Client actions."],
  ["vpxa.log", "vCenter agent running on ESXi. Communication link between vCenter vpxd and hostd."],
  ["vmkernel.log", "ESXi core kernel log. Hardware devices, SCSI sense codes, NIC link transitions, PSOD dumps."],
  ["fdm.log", "Fault Domain Manager for vSphere HA. Heartbeat loss, master election, failover triggering."],
  ["vmon.log", "vCenter Service Lifecycle Manager. Tracks service crashes, timeouts, and automated restarts."]
];

// Official SVG Logos for Technology Platforms
function getPlatformLogoSvg(platform, size = 18) {
  const p = String(platform || '').toLowerCase();
  if (p.includes('vmware')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="platform-logo"><rect width="24" height="24" rx="4" fill="#0070cd"/><path d="M4.5 8h2.3l1.8 5 1.8-5h2.3l-3 7.8H7.5L4.5 8zm8.7 0h2.2l1.6 4.6 1.6-4.6h2.2l-2.8 7.8h-2.1L13.2 8z" fill="#fff"/></svg>`;
  }
  if (p.includes('windows')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="platform-logo"><rect x="2" y="3" width="9.5" height="8.5" fill="#F25022"/><rect x="12.5" y="3" width="9.5" height="8.5" fill="#7FBA00"/><rect x="2" y="12.5" width="9.5" height="8.5" fill="#00A4EF"/><rect x="12.5" y="12.5" width="9.5" height="8.5" fill="#FFB900"/></svg>`;
  }
  if (p.includes('linux')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="platform-logo"><path d="M12 2c-3 0-5 2.5-5 5.5 0 1.5.5 3.5 0 5-1 .5-2 2-2 4.5 0 2.5 2 3.5 4 3.5 1 0 1.5-.5 3-.5s2 .5 3 .5c2 0 4-1 4-3.5 0-2.5-1-4-2-4.5-.5-1.5 0-3.5 0-5 0-3-2-5.5-5-5.5z" fill="#f8fafc"/><path d="M12 3c-2.2 0-3.8 1.8-3.8 4.2 0 1.2.3 2.8 0 4-.8.4-1.7 1.6-1.7 3.8 0 2 1.6 2.8 3.3 2.8.8 0 1.3-.4 2.2-.4s1.4.4 2.2.4c1.7 0 3.3-.8 3.3-2.8 0-2.2-.9-3.4-1.7-3.8-.3-1.2 0-2.8 0-4C15.8 4.8 14.2 3 12 3z" fill="#0f172a"/><ellipse cx="10.5" cy="6.5" rx="1.2" ry="1.6" fill="#fff"/><circle cx="10.8" cy="6.6" r="0.7" fill="#000"/><ellipse cx="13.5" cy="6.5" rx="1.2" ry="1.6" fill="#fff"/><circle cx="13.2" cy="6.6" r="0.7" fill="#000"/><path d="M10.2 8.5c0-.2.8-1 1.8-1s1.8.8 1.8 1c0 1-1 2.2-1.8 2.2s-1.8-1.2-1.8-2.2z" fill="#f59e0b"/><ellipse cx="12" cy="14" rx="3.5" ry="4" fill="#f8fafc"/><path d="M7 19.5c0-1 1.5-1.5 3-1.5s2 .5 2 1.5c0 .8-1 1.5-2.5 1.5S7 20.3 7 19.5zm5 0c0-1 1.5-1.5 3-1.5s2 .5 2 1.5c0 .8-1 1.5-2.5 1.5S12 20.3 12 19.5z" fill="#f59e0b"/></svg>`;
  }
  if (p.includes('cisco') || p.includes('ucs')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="platform-logo"><rect width="24" height="24" rx="4" fill="#005073"/><path d="M4 14.5h1.5v3H4zm2.5-3H8v6H6.5zm2.5-2H10.5v8H9zm2.5 3H13v5h-1.5zm2.5-3H15.5v8H14zm2.5 2H18v6h-1.5zm2.5 3H20v3h-1.5z" fill="#00bceb"/><path d="M4 8.5h1.5v2H4zm2.5-2H8v4H6.5zm2.5-1.5H10.5v5.5H9zm2.5 2H13v3.5h-1.5zm2.5-2H15.5v5.5H14zm2.5 1.5H18v4h-1.5zm2.5 2H20v2h-1.5z" fill="#ffffff"/></svg>`;
  }
  if (p.includes('aws')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="platform-logo"><rect width="24" height="24" rx="4" fill="#232f3e"/><text x="4" y="12" font-family="sans-serif" font-weight="900" font-size="7" fill="#ffffff">AWS</text><path d="M4 15.5c4 2.8 11 2.8 15 0" stroke="#ff9900" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M18.5 13.5l1.5 2.5-2.8.5" fill="#ff9900"/></svg>`;
  }
  if (p.includes('azure')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="platform-logo"><rect width="24" height="24" rx="4" fill="#0078d4"/><path d="M6 17.5l4-11h4l-4 11H6zm5.5 0l2.5-6.5 4 6.5h-6.5z" fill="#ffffff"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="platform-logo"><rect width="24" height="24" rx="4" fill="#334155"/><path d="M4 6h16v12H4z" stroke="#94a3b8" stroke-width="2"/><circle cx="8" cy="12" r="1.5" fill="#38bdf8"/></svg>`;
}

function platformOf(x) {
  return x.platform || 'VMware';
}

function embeddedDB() {
  const get = (name) => {
    try {
      return (typeof window !== "undefined" && window[name] !== undefined) ? window[name] : null;
    } catch (e) {
      return null;
    }
  };
  const articles = get('KB_ARTICLES');
  const scripts = get('SCRIPTS');
  const commands = get('COMMANDS');
  const resources = get('RESOURCES');
  const log_map = get('LOG_MAP');

  return normalizeDB({
    articles: Array.isArray(articles) && articles.length > 0 ? articles : BUILTIN_ARTICLES,
    scripts: Array.isArray(scripts) && scripts.length > 0 ? scripts : BUILTIN_SCRIPTS,
    commands: Array.isArray(commands) && commands.length > 0 ? commands : BUILTIN_COMMANDS,
    resources: Array.isArray(resources) && resources.length > 0 ? resources : BUILTIN_RESOURCES,
    log_map: Array.isArray(log_map) && log_map.length > 0 ? log_map : BUILTIN_LOG_MAP
  });
}

function normalizeDB(data) {
  const out = { articles: [], scripts: [], commands: [], resources: [], log_map: [], ...(data || {}) };
  for (const k of ['articles', 'scripts', 'commands', 'resources']) {
    out[k] = (Array.isArray(out[k]) ? out[k] : []).map(x => ({ ...x, platform: x.platform || 'VMware' }));
  }
  if (!out.articles.length) out.articles = [...BUILTIN_ARTICLES];
  if (!out.commands.length) out.commands = [...BUILTIN_COMMANDS];
  if (!out.scripts.length) out.scripts = [...BUILTIN_SCRIPTS];
  if (!out.resources.length) out.resources = [...BUILTIN_RESOURCES];
  out.log_map = Array.isArray(out.log_map) && out.log_map.length > 0 ? out.log_map : BUILTIN_LOG_MAP;
  return out;
}

function localDB() {
  try {
    const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (cur && typeof cur === 'object') return normalizeDB(cur);

    const previous = JSON.parse(localStorage.getItem(PREVIOUS_KEY) || 'null');
    if (previous && typeof previous === 'object') {
      const migrated = normalizeDB(previous);
      saveLocal(migrated);
      return migrated;
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (legacy && typeof legacy === 'object') {
      const migrated = normalizeDB(legacy);
      saveLocal(migrated);
      return migrated;
    }
  } catch (e) {}
  return embeddedDB();
}

function saveLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

async function loadDB() {
  DB = localDB();
  populateSidebarLogos();
  renderAll();
  updateSidebarFilterCounts();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://sysadminiq-api.baijucm.workers.dev', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const d1Articles = await response.json();
      if (Array.isArray(d1Articles) && d1Articles.length > 0) {
        const d1Map = new Map();
        d1Articles.forEach(a => d1Map.set(String(a.id), a));
        const merged = [...d1Articles];
        BUILTIN_ARTICLES.forEach(b => {
          if (!d1Map.has(String(b.id))) {
            merged.push(b);
          }
        });
        DB.articles = merged;
        saveLocal(DB);
        BACKEND_ONLINE = true;
        renderAll();
        updateSidebarFilterCounts();
      }
    }
  } catch (e) {
    BACKEND_ONLINE = false;
    console.log('Using local database:', e.message);
  }
}

function populateSidebarLogos() {
  const map = {
    'VMware': '#sidebarLogo-VMware',
    'Windows': '#sidebarLogo-Windows',
    'Linux': '#sidebarLogo-Linux',
    'Cisco UCS': '#sidebarLogo-Cisco',
    'AWS': '#sidebarLogo-AWS',
    'Azure': '#sidebarLogo-Azure'
  };
  for (const [p, sel] of Object.entries(map)) {
    const el = $(sel);
    if (el) el.innerHTML = getPlatformLogoSvg(p, 18);
  }
}

function updateSidebarFilterCounts() {
  const platforms = ['VMware', 'Windows', 'Linux', 'Cisco UCS', 'AWS', 'Azure'];
  platforms.forEach(p => {
    const count = DB.articles.filter(a => platformOf(a).toLowerCase().includes(p.toLowerCase())).length;
    const countId = p === 'Cisco UCS' ? 'count-Cisco' : `count-${p}`;
    const el = document.getElementById(countId);
    if (el) el.textContent = count;
  });
}

function toggleSidebarFilter(platform) {
  nav('knowledge');
  const sel = $('#kbPlatform');
  if (sel) sel.value = platform;
  renderKB($('#kbSearch')?.value || '', platform, $('#kbCategory')?.value || 'all');
}

function filterByPlatform(platform) {
  nav('knowledge');
  const sel = $('#kbPlatform');
  if (sel) sel.value = platform;
  renderKB($('#kbSearch')?.value || '', platform, $('#kbCategory')?.value || 'all');
}

function copy(text) {
  const val = Array.isArray(text) ? text.join('\n') : String(text);
  navigator.clipboard.writeText(val)
    .then(() => alert('Copied to clipboard.'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = val;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Copied to clipboard.');
    });
}

function nav(view) {
  $$('.sidebar-item').forEach(x => {
    if (x.dataset.view) {
      x.classList.toggle('active', x.dataset.view === view);
    }
  });
  $$('.view').forEach(x => x.classList.toggle('active', x.id === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function articleCard(a) {
  const platform = platformOf(a);
  const logo = getPlatformLogoSvg(platform, 15);
  return `
    <div class="article-card" data-article="${esc(a.id)}">
      <div class="article-card-header">
        <span class="platform-tag-pill">
          ${logo}
          <span>${esc(platform)}</span>
        </span>
        <span class="subtag">${esc(a.category || 'General')}</span>
      </div>
      <h3>${esc(a.title)}</h3>
      <p>${esc(arr(a.symptoms)[0] || a.description || (a.content ? a.content.slice(0, 110) + '...' : 'Diagnostic playbook'))}</p>
    </div>
  `;
}

function bindArticleCards() {
  $$('[data-article]').forEach(e => {
    e.onclick = () => openArticle(DB.articles.find(a => String(a.id) === String(e.dataset.article)));
  });
}

function openArticleById(id) {
  const a = DB.articles.find(x => String(x.id) === String(id));
  if (a) openArticle(a);
}

// Rich Formatted Callout, OneNote & Markdown Parser
function formatArticleContent(raw) {
  if (!raw) return '';

  let html = raw;

  // 1. OneNote Checklists [ ] and [x]
  html = html.replace(/^(\s*)- \[ \] (.*$)/gim, `
    <div class="onenote-todo-item">
      <input type="checkbox" class="onenote-todo-checkbox" onchange="this.parentElement.classList.toggle('checked', this.checked)">
      <span class="todo-text">$2</span>
    </div>
  `);
  html = html.replace(/^(\s*)- \[[xX]\] (.*$)/gim, `
    <div class="onenote-todo-item checked">
      <input type="checkbox" class="onenote-todo-checkbox" checked onchange="this.parentElement.classList.toggle('checked', this.checked)">
      <span class="todo-text">$2</span>
    </div>
  `);

  // 2. Format callouts :::type [title]
  html = html.replace(/:::(\w+)\s*\[(.*?)\]([\s\S]*?):::/g, (match, type, title, body) => {
    return `
      <div class="callout callout-${type}">
        <div class="callout-header">${esc(title)}</div>
        <div>${body.trim().replace(/\n/g, '<br>')}</div>
      </div>
    `;
  });

  html = html.replace(/\[CALLOUT:(\w+)\]([\s\S]*?)\[\/CALLOUT\]/g, (match, type, body) => {
    const t = type.toLowerCase();
    return `
      <div class="callout callout-${t}">
        <div>${body.trim().replace(/\n/g, '<br>')}</div>
      </div>
    `;
  });

  // 3. Code blocks with copy button
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `
      <div style="position:relative; margin:12px 0;">
        <button class="copy" onclick='copy(${JSON.stringify(code.trim())})'>Copy</button>
        <pre>${esc(code.trim())}</pre>
      </div>
    `;
  });

  // 4. Markdown tables (| Header 1 | Header 2 |)
  html = html.replace(/((?:\|[^\n]+\|\r?\n){2,})/g, (match) => {
    const lines = match.trim().split(/\r?\n/);
    if (lines.length < 2) return match;
    const headerLine = lines[0];
    const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
    const bodyLines = lines.slice(1).filter(l => !l.match(/^\|[\s\-:|]+\|$/));
    return `
      <table class="onenote-table">
        <thead>
          <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${bodyLines.map(line => {
            const cells = line.split('|').map(s => s.trim()).filter(Boolean);
            return `<tr>${cells.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  });

  // 5. Markdown Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color:#fff; font-size:18px; margin:16px 0 8px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color:#fff; font-size:22px; margin:18px 0 10px 0;">$1</h1>');

  // 6. Bold, Italic & Inline Code
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  html = html.replace(/`([^`]+)`/g, '<code style="background:#090e1a; padding:2px 6px; border-radius:4px; color:#38bdf8;">$1</code>');

  // If text does not contain block HTML, convert double newlines
  if (!/<p>|<div|<table|<h\d/i.test(html)) {
    html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  return html;
}

// In-Website Document & Attachment Viewer (Restricted Download)
let currentViewerZoom = 1.0;

function parseAttachmentsList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
}

async function probeFileUrl(rawKey, fileName) {
  if (rawKey.startsWith('data:') || rawKey.startsWith('blob:')) {
    return { ok: true, key: rawKey, url: rawKey, contentType: '' };
  }

  const cleanName = fileName || (rawKey ? rawKey.split('/').pop() : '');
  const candidates = [
    rawKey,
    rawKey.startsWith('attachments/') ? rawKey.replace(/^attachments\//, '') : '',
    rawKey.startsWith('attachments/') ? 'test/' + rawKey.replace(/^attachments\//, '') : '',
    !rawKey.startsWith('test/') ? 'test/' + rawKey : '',
    cleanName,
    cleanName ? 'test/' + cleanName : ''
  ].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx);

  for (const candidateKey of candidates) {
    try {
      const testUrl = `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(candidateKey)}`;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(testUrl, { method: 'GET', signal: ctrl.signal });
      clearTimeout(tid);
      if (res.status === 200) {
        return {
          ok: true,
          key: candidateKey,
          url: testUrl,
          contentType: res.headers.get('content-type') || ''
        };
      }
    } catch {}
  }

  return {
    ok: false,
    key: rawKey,
    url: `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(rawKey)}`,
    candidates
  };
}

async function renderDocxContent(arrayBuf, targetEl, docTitle) {
  try {
    let htmlResult = '';
    // 1. Try client-side mammoth
    if (window.mammoth && window.mammoth.convertToHtml) {
      const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuf });
      htmlResult = result.value;
    } else {
      // 2. Try server-side fallback
      const base64Str = btoa(new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const res = await fetch('/api/docs/render-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64Str })
      });
      if (res.ok) {
        const data = await res.json();
        htmlResult = data.html || '';
      }
    }

    if (htmlResult) {
      targetEl.innerHTML = `
        <div class="secure-viewer-docx-content">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:20px;">
            <div>
              <span style="font-size:11px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.04em;">Word Document Playbook</span>
              <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:4px 0 0 0;">${esc(docTitle)}</h2>
            </div>
            <span class="secure-badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">🔒 In-Website View Mode</span>
          </div>
          <div class="docx-body">
            ${htmlResult}
          </div>
        </div>
      `;
    } else {
      targetEl.innerHTML = `
        <div style="text-align:center; padding:40px; color:#cbd5e1;">
          <h3>Unable to render Word Document</h3>
          <p style="color:var(--text-muted); font-size:12px;">The document is loaded in memory but could not be parsed into HTML.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Docx render error:', err);
    targetEl.innerHTML = `
      <div style="text-align:center; padding:40px; color:#cbd5e1;">
        <h3 style="color:#f87171;">Document Parser Error</h3>
        <p style="color:var(--text-muted); font-size:12px;">${esc(err.message)}</p>
      </div>
    `;
  }
}

async function openSecureViewer(rawKey, fileName, fileType) {
  if (!rawKey || rawKey === 'undefined' || rawKey === 'null') {
    alert('This attachment does not have a valid storage key.');
    return;
  }

  const modal = $('#secureViewerModal');
  const body = $('#secureViewerBody');
  const nameEl = $('#secureViewerFilename');
  const iconEl = $('#secureViewerIcon');
  if (!modal || !body) return;

  nameEl.textContent = fileName || 'Attachment';
  iconEl.textContent = '⏳';
  currentViewerZoom = 1.0;
  modal.classList.remove('hidden');

  body.innerHTML = `
    <div style="text-align:center; padding:60px 20px; color:#94a3b8;">
      <div style="font-size:42px; margin-bottom:14px;">⏳</div>
      <h3 style="color:#f8fafc; font-size:17px; margin-bottom:6px;">Connecting to secure storage...</h3>
      <p style="font-size:12px; color:#64748b;">Retrieving ${esc(fileName || 'document')} from Cloudflare R2 bucket</p>
    </div>
  `;

  const probe = await probeFileUrl(rawKey, fileName);
  const ext = (fileName || rawKey || '').split('.').pop().toLowerCase();
  const isImg = (fileType?.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext));
  const isPdf = (fileType?.includes('pdf') || ext === 'pdf');
  const isDocx = (ext === 'docx' || ext === 'doc');
  const isCode = ['txt', 'log', 'sh', 'ps1', 'json', 'yaml', 'yml', 'xml', 'conf'].includes(ext);

  if (!probe.ok) {
    iconEl.textContent = '⚠️';
    body.innerHTML = `
      <div style="text-align:center; padding:36px 20px; color:#cbd5e1; max-width:680px; margin:0 auto;">
        <div style="font-size:48px; margin-bottom:12px;">⚠️</div>
        <h3 style="color:#fff; font-size:18px; margin-bottom:6px;">Document Not Found in Cloudflare R2</h3>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:18px;">
          Document: <b style="color:#f8fafc;">${esc(fileName || rawKey)}</b>
        </p>

        <div class="callout callout-warning" style="text-align:left; margin-bottom:16px;">
          <div class="callout-header">Storage Discrepancy (Cloudflare R2 HTTP 404)</div>
          <div style="font-size:12px; line-height:1.6; color:#cbd5e1;">
            The article row in your <b>Cloudflare D1 database</b> references storage path:
            <code style="display:block; margin:6px 0; background:#0b1120; padding:6px 10px; border-radius:6px; color:#fbbf24; word-break:break-all;">
              ${esc(rawKey)}
            </code>
            This file object has not been stored in your Cloudflare R2 bucket yet.
          </div>
        </div>

        <!-- Interactive In-Modal Local Document Viewer & Sync -->
        <div class="dropzone" id="viewerLocalDropzone" style="margin:20px 0; padding:24px; cursor:pointer;" onclick="document.getElementById('viewerLocalPicker').click()">
          <input type="file" id="viewerLocalPicker" style="display:none;" onchange="handleViewerLocalFile(event, '${esc(fileName)}')">
          <div style="font-size:32px; margin-bottom:6px;">📂</div>
          <div style="color:#fff; font-weight:700; font-size:14px; margin-bottom:4px;">Have "${esc(fileName)}" on your computer?</div>
          <div style="color:var(--text-muted); font-size:12px;">Click here or drop the file to open and view it right now in this window!</div>
        </div>

        <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
          <a href="publisher.html" class="btn btn-primary" style="text-decoration:none;">
            ✏️ Open Publisher to Upload
          </a>
          <button type="button" class="btn btn-secondary" onclick="closeSecureViewer()">Close Viewer</button>
        </div>
      </div>
    `;

    // Setup drag and drop on the fallback dropzone
    const dropzone = document.getElementById('viewerLocalDropzone');
    if (dropzone) {
      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = '#0070f3'; };
      dropzone.ondragleave = () => { dropzone.style.borderColor = 'var(--border)'; };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          renderLocalFileInViewer(e.dataTransfer.files[0]);
        }
      };
    }
    return;
  }

  const fileUrl = probe.url;
  nameEl.textContent = fileName || 'Attachment';
  iconEl.textContent = isImg ? '🖼️' : (isPdf ? '📕' : (isDocx ? '📘' : (isCode ? '📋' : '📄')));

  if (isDocx) {
    body.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#94a3b8;">
        <div style="font-size:42px; margin-bottom:14px;">📘</div>
        <h3 style="color:#f8fafc; font-size:17px; margin-bottom:6px;">Formatting Word Document...</h3>
        <p style="font-size:12px; color:#64748b;">Rendering tables, headings, and instructions inline</p>
      </div>
    `;
    try {
      const res = await fetch(fileUrl);
      const arrayBuf = await res.arrayBuffer();
      await renderDocxContent(arrayBuf, body, fileName || 'Word Document Playbook');
    } catch (err) {
      body.innerHTML = `<div style="text-align:center; padding:40px; color:#f87171;">Failed to load Word document: ${esc(err.message)}</div>`;
    }
  } else if (isImg) {
    body.innerHTML = `
      <img id="secureViewerImg" src="${fileUrl}" class="secure-viewer-img" alt="${esc(fileName)}" draggable="false" oncontextmenu="return false;">
    `;
  } else if (isPdf) {
    body.innerHTML = `
      <iframe src="${fileUrl}#toolbar=0&navpanes=0&scrollbar=0" class="secure-viewer-iframe" style="width:100%; height:100%; min-height:560px; border:none; background:#0b0f19;"></iframe>
    `;
  } else if (isCode) {
    body.innerHTML = `<div class="secure-viewer-text">Loading document content securely...</div>`;
    fetch(fileUrl)
      .then(r => r.text())
      .then(t => {
        body.innerHTML = `
          <div style="position:relative;">
            <button class="copy" style="position:absolute; top:8px; right:8px;" onclick='copy(${JSON.stringify(t)})'>Copy Content</button>
            <div class="secure-viewer-text">${esc(t)}</div>
          </div>
        `;
      })
      .catch(() => {
        body.innerHTML = `<div class="secure-viewer-text">Unable to load text document inline.</div>`;
      });
  } else {
    body.innerHTML = `
      <div style="text-align:center; padding:40px; color:#cbd5e1; max-width:620px; margin:0 auto;">
        <div style="font-size:48px; margin-bottom:12px;">📄</div>
        <h3 style="color:#fff; font-size:18px; margin-bottom:6px;">${esc(fileName)}</h3>
        <p style="color:var(--text-muted); font-size:12px; margin-bottom:18px;">Diagnostic Document • In-Website View Mode Active</p>
        <div class="callout callout-info" style="text-align:left;">
          <div class="callout-header">🔒 In-Website View Policy</div>
          <div>Direct file download is restricted for read-only users. This document is authenticated and stored securely in Cloudflare R2 storage under key <code>${esc(probe.key)}</code>.</div>
        </div>
      </div>
    `;
  }
}

// Local File Preview Handler inside Viewer Modal
window.handleViewerLocalFile = function(e, expectedName) {
  if (e.target.files && e.target.files[0]) {
    renderLocalFileInViewer(e.target.files[0]);
  }
};

async function renderLocalFileInViewer(file) {
  const body = $('#secureViewerBody');
  const nameEl = $('#secureViewerFilename');
  const iconEl = $('#secureViewerIcon');
  if (!body) return;

  nameEl.textContent = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDocx = ['docx', 'doc'].includes(ext);
  const isCode = ['txt', 'log', 'sh', 'ps1', 'json', 'yaml', 'yml', 'xml', 'conf'].includes(ext);

  iconEl.textContent = isImg ? '🖼️' : (isPdf ? '📕' : (isDocx ? '📘' : (isCode ? '📋' : '📄')));

  if (isDocx) {
    body.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;">Processing Word Document...</div>`;
    const arrayBuf = await file.arrayBuffer();
    await renderDocxContent(arrayBuf, body, file.name);
  } else if (isPdf) {
    const objectUrl = URL.createObjectURL(file);
    body.innerHTML = `
      <iframe src="${objectUrl}#toolbar=0" class="secure-viewer-iframe" style="width:100%; height:100%; min-height:560px; border:none; background:#0b0f19;"></iframe>
    `;
  } else if (isImg) {
    const objectUrl = URL.createObjectURL(file);
    body.innerHTML = `<img id="secureViewerImg" src="${objectUrl}" class="secure-viewer-img" alt="${esc(file.name)}" draggable="false">`;
  } else if (isCode) {
    const text = await file.text();
    body.innerHTML = `<div class="secure-viewer-text">${esc(text)}</div>`;
  }
}

function closeSecureViewer() {
  const modal = $('#secureViewerModal');
  if (modal) modal.classList.add('hidden');
  const body = $('#secureViewerBody');
  if (body) body.innerHTML = '';
}

function zoomSecureViewer(delta) {
  const img = $('#secureViewerImg');
  const docx = $('.secure-viewer-docx-content');
  if (img) {
    currentViewerZoom = Math.max(0.4, Math.min(3.0, currentViewerZoom + delta));
    img.style.transform = `scale(${currentViewerZoom})`;
  } else if (docx) {
    currentViewerZoom = Math.max(0.7, Math.min(2.0, currentViewerZoom + delta));
    docx.style.zoom = currentViewerZoom;
  }
}

function resetSecureZoom() {
  const img = $('#secureViewerImg');
  const docx = $('.secure-viewer-docx-content');
  currentViewerZoom = 1.0;
  if (img) img.style.transform = 'scale(1)';
  if (docx) docx.style.zoom = 1.0;
}

// Expose globals for onclick attributes
window.openSecureViewer = openSecureViewer;
window.closeSecureViewer = closeSecureViewer;
window.zoomSecureViewer = zoomSecureViewer;
window.resetSecureZoom = resetSecureZoom;

function renderAttachmentsList(rawAttachments) {
  const attachments = parseAttachmentsList(rawAttachments);
  if (!attachments || !attachments.length) return '';
  return `
    <h3>Attachments (${attachments.length})</h3>
    <div class="attachments" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
      ${attachments.map(file => {
        const rawKey = file.key || file.path || file.fileKey || file.url || file.name || '';
        const fileName = file.name || (rawKey ? rawKey.split('/').pop() : 'Diagnostic Attachment');
        const isValidKey = Boolean(rawKey && rawKey !== 'undefined' && rawKey !== 'null');
        const ext = (fileName || '').split('.').pop().toLowerCase();
        const isImg = file.type && (file.type.includes('png') || file.type.includes('jpg') || file.type.includes('jpeg') || file.type.includes('webp') || file.type.includes('image'));
        const isPdf = file.type?.includes('pdf') || ext === 'pdf';
        const isDocx = ext === 'docx' || ext === 'doc';
        const icon = isImg ? '🖼️' : (isPdf ? '📕' : (isDocx ? '📘' : '📎'));
        const keyForClick = encodeURIComponent(rawKey);
        const nameForClick = encodeURIComponent(fileName);
        const typeForClick = encodeURIComponent(file.type || ext);
        return `
          <div class="attachment-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#090e1a; border:1px solid #202d48; border-radius:8px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:20px;">${icon}</span>
              <div>
                <div style="color:#f8fafc; font-weight:600; font-size:14px;">
                  ${esc(fileName)}
                </div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">
                  ${esc(file.type || ext.toUpperCase())} ${file.size ? '• ' + Math.round(file.size / 1024) + ' KB' : ''} • 🔒 View-Only
                </div>
              </div>
            </div>
            ${isValidKey ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="openSecureViewer(decodeURIComponent('${keyForClick}'), decodeURIComponent('${nameForClick}'), decodeURIComponent('${typeForClick}'))">
                👁️ View in Website
              </button>
            ` : `
              <span style="font-size:11px; color:#64748b;">No storage key</span>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openArticle(a) {
  if (!a) return;
  const modalContent = $('#modalContent');
  if (!modalContent) return;

  const platform = platformOf(a);
  const logo = getPlatformLogoSvg(platform, 18);
  const isD1Article = a.content && !a.symptoms && !a.causes;

  if (isD1Article) {
    modalContent.innerHTML = `
      <div class="article-detail">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span class="platform-tag-pill">${logo} <span>${esc(platform)}</span></span>
          <span class="subtag">${esc(a.category || 'General')}</span>
        </div>
        <h1>${esc(a.title)}</h1>
        <div style="margin-top:16px;">
          ${formatArticleContent(a.content || '')}
        </div>
        ${renderAttachmentsList(a.attachments)}
      </div>
    `;
  } else {
    const list = x => `<ul>${arr(x).map(v => `<li>${esc(v)}</li>`).join('')}</ul>`;

    modalContent.innerHTML = `
      <div class="article-detail">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span class="platform-tag-pill">${logo} <span>${esc(platform)}</span></span>
          <span class="subtag">${esc(a.category || 'General')}</span>
        </div>
        <h1>${esc(a.title)}</h1>
        <p style="color:var(--text-secondary); margin-top:4px;">${esc(a.description || '')}</p>

        <h3>Symptoms</h3>
        ${list(a.symptoms)}

        <h3>Likely causes</h3>
        ${list(a.causes)}

        <h3>Investigation checks</h3>
        <ol>${arr(a.checks).map(x => `<li>${esc(x)}</li>`).join('')}</ol>

        ${a.commands ? `
          <h3>Commands</h3>
          <button class="copy" onclick='copy(${JSON.stringify(a.commands || "")})'>Copy</button>
          <pre>${esc(a.commands || '')}</pre>
        ` : ''}

        <h3>Important logs</h3>
        ${list(a.logs)}

        <h3>Resolution approach</h3>
        <ol>${arr(a.resolution).map(x => `<li>${esc(x)}</li>`).join('')}</ol>

        ${a.verification && a.verification.length ? `
          <h3>Verification</h3>
          <ol>${arr(a.verification).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        ` : ''}

        ${renderAttachmentsList(a.attachments)}
      </div>
    `;
  }

  const modal = $('#articleModal');
  if (modal) modal.classList.remove('hidden');
}

function closeArticleModal() {
  const modal = $('#articleModal');
  if (modal) modal.classList.add('hidden');
}

// Multi-AI Model Tools
let selectedAi = 'gemini';
let lastAiSolution = '';

function selectAiModel(model) {
  selectedAi = model;
  ['gemini', 'chatgpt', 'claude', 'perplexity', 'deepseek'].forEach(m => {
    $(`#tab-${m}`)?.classList.toggle('active', m === model);
  });

  const note = $('#aiStatusNote');
  const runBtn = $('#runAiBtn');

  if (model === 'gemini') {
    if (note) note.textContent = 'Integrated Live AI (Powered by Google Gemini Flash)';
    if (runBtn) {
      runBtn.textContent = '✨ Ask Google Gemini';
    }
  } else {
    const names = {
      chatgpt: 'ChatGPT (OpenAI)',
      claude: 'Claude (Anthropic)',
      perplexity: 'Perplexity AI',
      deepseek: 'DeepSeek AI'
    };
    if (note) note.textContent = `External Model: ${names[model]} (Launches with engineered sysadmin prompt)`;
    if (runBtn) {
      runBtn.textContent = `Launch in ${names[model]} ↗`;
    }
  }
}

function applyAiPrompt(promptText) {
  const input = $('#aiPromptInput');
  if (input) {
    input.value = promptText;
    input.focus();
  }
}

async function submitAiQuery() {
  if (selectedAi !== 'gemini') {
    openExternalAi();
    return;
  }

  const promptInput = $('#aiPromptInput');
  const platform = $('#aiPlatformSelect')?.value || 'VMware';
  const query = promptInput?.value.trim();

  if (!query) {
    alert('Please enter an issue description or question.');
    promptInput?.focus();
    return;
  }

  const runBtn = $('#runAiBtn');
  const outPanel = $('#aiOutputPanel');
  const outContent = $('#aiOutputContent');

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = '✨ Gemini is analyzing...';
  }

  if (outPanel) outPanel.style.display = 'block';
  if (outContent) outContent.innerHTML = '<p style="color:#60a5fa; font-style:italic;">Running diagnostics with Google Gemini Flash...</p>';

  try {
    const res = await fetch('/api/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: query, platform })
    });

    if (!res.ok) throw new Error('AI Server responded with ' + res.status);
    const data = await res.json();
    lastAiSolution = data.response || 'No solution generated.';
    if (outContent) outContent.innerHTML = formatArticleContent(lastAiSolution);
  } catch (err) {
    if (outContent) outContent.innerHTML = `<div class="callout callout-danger"><div class="callout-header">AI Diagnosis Failed</div><div>${esc(err.message)}</div></div>`;
  } finally {
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = '✨ Ask Google Gemini';
    }
  }
}

function openExternalAi() {
  const query = $('#aiPromptInput')?.value.trim() || 'SysAdmin troubleshooting playbook';
  const platform = $('#aiPlatformSelect')?.value || 'VMware';
  const engineered = `Act as an enterprise Systems Administrator and Infrastructure Engineer. Diagnose this ${platform} issue with root cause analysis, diagnostic commands, and remediation playbook:\n\n${query}`;

  const urls = {
    chatgpt: `https://chatgpt.com/?q=${encodeURIComponent(engineered)}`,
    claude: `https://claude.ai/new?q=${encodeURIComponent(engineered)}`,
    perplexity: `https://www.perplexity.ai/search?q=${encodeURIComponent(engineered)}`,
    deepseek: `https://chat.deepseek.com/?q=${encodeURIComponent(engineered)}`
  };

  const targetUrl = urls[selectedAi] || urls.chatgpt;
  window.open(targetUrl, '_blank');
}

function copyAiOutput() {
  if (lastAiSolution) {
    copy(lastAiSolution);
  } else {
    alert('No AI solution to copy.');
  }
}

function exportAiToPublisher() {
  window.open('publisher.html', '_blank');
}

function sendLogsToAi() {
  const log = $('#logInput')?.value.trim();
  if (!log) {
    alert('Please paste log lines first.');
    return;
  }
  nav('ai-assistant');
  const input = $('#aiPromptInput');
  if (input) {
    input.value = `Analyze and identify root-cause from this infrastructure log excerpt:\n\n${log}`;
    submitAiQuery();
  }
}

// Unified Multi-Content & Internet Search
let currentResearchTab = 'all';

function executeGlobalSearch() {
  const q = $('#globalSearchInput')?.value.trim();
  if (!q) return;
  nav('research');
  const rInput = $('#researchInput');
  if (rInput) rInput.value = q;
  executeResearchSearch();
}

function executeInternetSearch() {
  const q = $('#globalSearchInput')?.value.trim() || $('#researchInput')?.value.trim() || '';
  if (!q) {
    alert('Please enter a search term first.');
    return;
  }
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q + ' infrastructure troubleshooting')}`, '_blank');
}

function executeResearchSearch() {
  const q = ($('#researchInput')?.value || '').toLowerCase().trim();
  const resEl = $('#researchResults');
  if (!resEl) return;

  const matchStr = (val) => String(val || '').toLowerCase().includes(q);

  const articles = DB.articles.filter(a => !q || matchStr(a.title) || matchStr(a.content) || matchStr(a.category) || matchStr(a.platform) || matchStr(a.keywords));
  const commands = DB.commands.filter(c => !q || matchStr(c.name) || matchStr(c.cmd) || matchStr(c.category) || matchStr(c.use));
  const scripts = DB.scripts.filter(s => !q || matchStr(s.title) || matchStr(s.code) || matchStr(s.category) || matchStr(s.platform));
  const logs = (DB.log_map || []).filter(l => !q || matchStr(l[0]) || matchStr(l[1]));

  $('#researchCount-all').textContent = articles.length + commands.length + scripts.length + logs.length;
  $('#researchCount-articles').textContent = articles.length;
  $('#researchCount-commands').textContent = commands.length;
  $('#researchCount-scripts').textContent = scripts.length;
  $('#researchCount-logs').textContent = logs.length;

  let html = '';

  if (currentResearchTab === 'all' || currentResearchTab === 'articles') {
    if (articles.length) {
      html += `<h3 style="margin:16px 0 10px 0; font-size:15px; color:#60a5fa;">📖 Knowledge Articles (${articles.length})</h3><div class="articles-grid">` + articles.map(articleCard).join('') + `</div>`;
    }
  }

  if (currentResearchTab === 'all' || currentResearchTab === 'commands') {
    if (commands.length) {
      html += `<h3 style="margin:24px 0 10px 0; font-size:15px; color:#34d399;">⌘ Diagnostic Commands (${commands.length})</h3>` + commands.map(c => `
        <div class="command">
          <button class="copy" onclick='copy(${JSON.stringify(c.cmd || c.code || "")})'>Copy</button>
          <b>${esc(c.name || c.title)}</b><br>
          <small>${esc(c.platform || '')} • ${esc(c.category || '')} — ${esc(c.use || c.description || '')}</small>
          <pre>${esc(c.cmd || c.code || '')}</pre>
        </div>
      `).join('');
    }
  }

  if (currentResearchTab === 'all' || currentResearchTab === 'scripts') {
    if (scripts.length) {
      html += `<h3 style="margin:24px 0 10px 0; font-size:15px; color:#f59e0b;">⚡ Automation Scripts (${scripts.length})</h3>` + scripts.map(s => `
        <div class="command">
          <button class="copy" onclick='copy(${JSON.stringify(s.code || "")})'>Copy Script</button>
          <b>${esc(s.title || s.name)}</b><br>
          <small>${esc(s.platform || '')} — ${esc(s.desc || s.description || '')}</small>
          <pre>${esc(s.code || '')}</pre>
        </div>
      `).join('');
    }
  }

  if (currentResearchTab === 'all' || currentResearchTab === 'logs') {
    if (logs.length) {
      html += `<h3 style="margin:24px 0 10px 0; font-size:15px; color:#c084fc;">📋 Log Patterns (${logs.length})</h3>` + logs.map(l => `
        <div class="command">
          <b>${esc(l[0])}</b><br>
          <small>${esc(l[1])}</small>
        </div>
      `).join('');
    }
  }

  if (!html) {
    html = `<div class="card" style="text-align:center; padding:32px; color:var(--text-muted);">No local matches found for "${esc(q)}". Try searching external portals below!</div>`;
  }

  resEl.innerHTML = html;
  bindArticleCards();
}

function filterResearchTab(tab) {
  currentResearchTab = tab;
  $$('.search-filter-tab').forEach(b => b.classList.toggle('active', b.dataset.type === tab));
  executeResearchSearch();
}

function launchWebSearch(engine) {
  const q = $('#researchInput')?.value.trim() || $('#globalSearchInput')?.value.trim() || 'infrastructure troubleshooting';
  const urls = {
    broadcom: `https://knowledge.broadcom.com/external/search?searchString=${encodeURIComponent(q)}`,
    cisco: `https://www.cisco.com/c/en/us/support/search.html#~keyword=${encodeURIComponent(q)}`,
    microsoft: `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(q)}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    stackoverflow: `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`
  };
  window.open(urls[engine] || urls.google, '_blank');
}

// Dashboard Platform Grid with Genuine Logos
function renderPlatforms() {
  const el = $('#platformGrid');
  if (!el) return;
  el.innerHTML = MAIN_CATEGORIES.map(c => {
    const count = DB.articles.filter(a => platformOf(a) === c.name).length;
    const logo = getPlatformLogoSvg(c.name, 24);
    return `
      <div class="platform-card" data-platform="${esc(c.name)}">
        <div class="platform-card-header">
          <div class="platform-logo-box">${logo}</div>
          <div>
            <div class="platform-title">${esc(c.name)}</div>
            <div class="subtag">${count} Playbooks</div>
          </div>
        </div>
        <div class="platform-desc">${esc(c.desc)}</div>
        <div class="platform-meta">
          <span>Click to explore</span>
          <span style="color:var(--cf-blue);">→</span>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-platform]').forEach(b => {
    b.onclick = () => filterByPlatform(b.dataset.platform);
  });
}

function renderRecent() {
  const el = $('#recentArticles');
  if (!el) return;
  el.innerHTML = DB.articles.slice(0, 6).map(articleCard).join('') || '<div class="card">No articles found.</div>';
  bindArticleCards();
}

function renderDashboard() {
  renderPlatforms();
  renderRecent();
}

function setupFilters() {
  const pSel = $('#kbPlatform');
  if (pSel && pSel.children.length <= 1) {
    pSel.innerHTML = '<option value="all">All platforms</option>' + MAIN_CATEGORIES.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  }

  const cSel = $('#kbCategory');
  if (cSel) {
    const current = cSel.value || 'all';
    const cats = [...new Set(DB.articles.map(a => a.category).filter(Boolean))];
    cSel.innerHTML = '<option value="all">All subcategories</option>' + cats.map(c => `<option value="${esc(c)}" ${current === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
  }
}

function renderKB(q = '', platform = 'all', category = 'all') {
  const el = $('#kbResults');
  if (!el) return;

  const filtered = DB.articles.filter(a => {
    const matchesQ = !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase());
    const matchesP = platform === 'all' || platformOf(a) === platform;
    const matchesC = category === 'all' || a.category === category;
    return matchesQ && matchesP && matchesC;
  });

  el.innerHTML = filtered.map(articleCard).join('') || '<div class="card" style="text-align:center; padding:32px; color:var(--text-muted);">No playbooks match your filter.</div>';
  bindArticleCards();
}

function renderCommands(q = '') {
  const el = $('#commandResults');
  if (!el) return;
  q = q.toLowerCase();
  const filtered = DB.commands.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q));

  el.innerHTML = filtered.map((x, i) => `
    <div class="command">
      <button class="copy" data-copy="${i}">Copy</button>
      <b>${esc(x.name || x.title)}</b><br>
      <small>${esc(x.platform || '')} • ${esc(x.category || '')} — ${esc(x.use || x.description || '')}</small>
      <pre>${esc(x.cmd || x.code || '')}</pre>
    </div>
  `).join('') || '<div class="card">No commands found.</div>';

  $$('[data-copy]').forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.copy;
      if (filtered[idx]) copy(filtered[idx].cmd || filtered[idx].code || '');
    };
  });
}

function renderScripts() {
  const el = $('#scriptResults');
  if (!el) return;
  el.innerHTML = DB.scripts.map((x, i) => `
    <div class="command">
      <button class="copy" data-copy-script="${i}">Copy Script</button>
      <b>${esc(x.title || x.name)}</b><br>
      <small>${esc(x.platform || '')} — ${esc(x.category || '')} — ${esc(x.desc || x.description || '')}</small>
      <pre>${esc(x.code || '')}</pre>
    </div>
  `).join('') || '<div class="card">No automation scripts available.</div>';

  $$('[data-copy-script]').forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.copyScript;
      if (DB.scripts[idx]) copy(DB.scripts[idx].code || '');
    };
  });
}

function renderResources(q = '', cat = 'all') {
  const el = $('#resourceResults');
  if (!el) return;

  const cats = [...new Set(DB.resources.map(x => x.category).filter(Boolean))];
  const catSel = $('#resourceCategory');
  if (catSel && catSel.children.length <= 1) {
    catSel.innerHTML = '<option value="all">All categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  q = q.toLowerCase();
  const filtered = DB.resources.filter(x => {
    const matchesQ = !q || JSON.stringify(x).toLowerCase().includes(q);
    const matchesC = cat === 'all' || x.category === cat;
    return matchesQ && matchesC;
  });

  el.innerHTML = filtered.map(x => `
    <div class="article-card">
      <div class="article-card-header">
        <span class="platform-tag-pill">${getPlatformLogoSvg(x.platform || 'General', 14)} <span>${esc(x.platform || 'General')}</span></span>
        <span class="subtag">${esc(x.category || '')}</span>
      </div>
      <h3>${esc(x.name || x.title)}</h3>
      <p>${esc(x.description || '')}</p>
      ${x.notes ? `<small style="color:var(--text-muted); display:block; margin-top:8px;">💡 ${esc(x.notes)}</small>` : ''}
      <a href="${esc(x.url || '#')}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:12px; color:var(--cf-blue); font-size:12px; font-weight:bold; text-decoration:none;">
        Open Portal ↗
      </a>
    </div>
  `).join('') || '<div class="card">No resources found.</div>';
}

function inspectLogs() {
  const inputEl = $('#logInput');
  const outEl = $('#logOutput');
  if (!inputEl || !outEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    outEl.innerHTML = '<div class="card">Paste a log excerpt first.</div>';
    return;
  }

  const patterns = [
    ['vpxd', 'vCenter Server management daemon'],
    ['hostd', 'ESXi host management daemon'],
    ['vpxa', 'vCenter agent on ESXi'],
    ['vmkernel', 'ESXi core vmkernel (driver/SCSI/network)'],
    ['fdm', 'Fault Domain Manager / vSphere HA'],
    ['vmon', 'vCenter Service Lifecycle Manager'],
    ['certificate|ssl|trust', 'TLS/SSL certificate authentication failure'],
    ['apd|all paths down', 'Storage All-Paths-Down / Dead path condition'],
    ['kswapd|oom', 'Linux kernel memory reclaim / OOM killer']
  ];

  const hits = patterns.filter(([p]) => new RegExp(p, 'i').test(text));
  outEl.innerHTML = '<div class="card"><h2 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:12px;">Detected Originating Components</h2>' +
    (hits.length
      ? hits.map(x => `<div class="callout callout-warning"><div class="callout-header">${esc(x[1])}</div><div>Correlate timestamps and look for thread lockups in logs.</div></div>`).join('')
      : '<p style="color:var(--text-muted);">No known signature matched in pattern database.</p>') + '</div>';
}

function renderAll() {
  renderDashboard();
  setupFilters();
  renderKB($('#kbSearch')?.value || '', $('#kbPlatform')?.value || 'all', $('#kbCategory')?.value || 'all');
  renderCommands();
  renderScripts();
  renderResources();
}

function initSysAdminIQ() {
  // Knowledge Base filters
  const kbSearch = $('#kbSearch');
  const kbPlatform = $('#kbPlatform');
  const kbCategory = $('#kbCategory');

  if (kbSearch) {
    kbSearch.oninput = e => renderKB(e.target.value, kbPlatform?.value || 'all', kbCategory?.value || 'all');
  }
  if (kbPlatform) {
    kbPlatform.onchange = e => renderKB(kbSearch?.value || '', e.target.value, kbCategory?.value || 'all');
  }
  if (kbCategory) {
    kbCategory.onchange = e => renderKB(kbSearch?.value || '', kbPlatform?.value || 'all', e.target.value);
  }

  // Command search
  const cmdSearch = $('#commandSearch');
  if (cmdSearch) {
    cmdSearch.oninput = e => renderCommands(e.target.value);
  }

  // Log Inspector
  const inspectLogBtn = $('#inspectLogBtn');
  if (inspectLogBtn) inspectLogBtn.onclick = inspectLogs;

  // Resource Search
  const resourceSearch = $('#resourceSearch');
  const resourceCat = $('#resourceCategory');
  if (resourceSearch) {
    resourceSearch.oninput = e => renderResources(e.target.value, resourceCat?.value || 'all');
  }
  if (resourceCat) {
    resourceCat.onchange = e => renderResources(resourceSearch?.value || '', e.target.value);
  }

  // Load database and render
  loadDB();
}

// Global exports
window.nav = nav;
window.filterByPlatform = filterByPlatform;
window.toggleSidebarFilter = toggleSidebarFilter;
window.openArticleById = openArticleById;
window.openArticle = openArticle;
window.closeArticleModal = closeArticleModal;
window.openSecureViewer = openSecureViewer;
window.closeSecureViewer = closeSecureViewer;
window.zoomSecureViewer = zoomSecureViewer;
window.resetSecureZoom = resetSecureZoom;
window.copy = copy;
window.inspectLogs = inspectLogs;
window.renderKB = renderKB;
window.selectAiModel = selectAiModel;
window.applyAiPrompt = applyAiPrompt;
window.submitAiQuery = submitAiQuery;
window.openExternalAi = openExternalAi;
window.copyAiOutput = copyAiOutput;
window.exportAiToPublisher = exportAiToPublisher;
window.sendLogsToAi = sendLogsToAi;
window.executeGlobalSearch = executeGlobalSearch;
window.executeInternetSearch = executeInternetSearch;
window.executeResearchSearch = executeResearchSearch;
window.filterResearchTab = filterResearchTab;
window.launchWebSearch = launchWebSearch;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSysAdminIQ);
} else {
  initSysAdminIQ();
}
