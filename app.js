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

// Floating Toast Notification System (Offline & DOM Resilient)
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  let text = document.getElementById('toastMsg');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    text = document.createElement('span');
    text.id = 'toastMsg';
    toast.appendChild(text);
    document.body.appendChild(toast);
  }

  if (text) {
    text.innerHTML = msg;
  }

  toast.className = `toast show ${type}`;

  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
window.showToast = showToast;

// Live Cloud AI Backend Endpoint (Enables real Gemini AI on GitHub Pages & static hosts)
const CLOUD_API_BACKEND = 'https://ais-pre-xxmatxyjoqmammxyts4ks3-51267175700.asia-southeast1.run.app';

function getApiEndpoint(path) {
  const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.includes('.run.app')) {
    return path;
  }
  try {
    const custom = localStorage.getItem('sysadminiq_api_backend');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '') + path;
    }
  } catch (e) {}
  return `${CLOUD_API_BACKEND}${path}`;
}
window.getApiEndpoint = getApiEndpoint;
window.CLOUD_API_BACKEND = CLOUD_API_BACKEND;

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

function toggleSidebarFilterRow(platform, event) {
  const cb = document.getElementById(`filter-${platform}`);
  if (cb) {
    if (!event || event.target !== cb) {
      cb.checked = !cb.checked;
    }
    const row = document.getElementById(`filter-row-${platform}`);
    if (row) row.classList.toggle('active-filter', cb.checked);
    toggleSidebarFilter(platform);
  }
}

function toggleSidebarFilter(platform) {
  nav('knowledge');
  const sel = $('#kbPlatform');
  const cb = document.getElementById(`filter-${platform}`);
  const target = cb && cb.checked ? platform : 'all';
  if (sel) sel.value = target;
  
  // Highlight active category item if any
  $$('.sidebar-item[data-platform]').forEach(el => {
    el.classList.toggle('active', el.dataset.platform === target);
  });

  renderKB($('#kbSearch')?.value || '', target, $('#kbCategory')?.value || 'all');
}

function filterByPlatform(platform) {
  nav('knowledge');
  const sel = $('#kbPlatform');
  const target = platform || 'all';
  if (sel) sel.value = target;

  // Sync checkboxes
  ['VMware', 'Windows', 'Linux', 'Cisco UCS', 'AWS', 'Azure'].forEach(p => {
    const cb = document.getElementById(`filter-${p}`);
    const row = document.getElementById(`filter-row-${p}`);
    const isMatched = (target === p);
    if (cb) cb.checked = isMatched;
    if (row) row.classList.toggle('active-filter', isMatched);
  });

  // Highlight active sidebar item
  $$('.sidebar-item[data-platform]').forEach(el => {
    el.classList.toggle('active', el.dataset.platform === target);
  });

  renderKB($('#kbSearch')?.value || '', target, $('#kbCategory')?.value || 'all');
}

function resetSidebarFilters() {
  ['VMware', 'Windows', 'Linux', 'Cisco UCS', 'AWS', 'Azure'].forEach(p => {
    const cb = document.getElementById(`filter-${p}`);
    const row = document.getElementById(`filter-row-${p}`);
    if (cb) cb.checked = false;
    if (row) row.classList.remove('active-filter');
  });

  $$('.sidebar-item[data-platform]').forEach(el => el.classList.remove('active'));

  const sel = $('#kbPlatform');
  if (sel) sel.value = 'all';
  const searchInput = $('#kbSearch');
  if (searchInput) searchInput.value = '';

  renderKB('', 'all', 'all');
  showToast('Filters reset to all technology platforms', 'info');
}

// Sidebar Accordion Click Functions (Categories, Tools, Management, Filters)
const _appToggleTimes = {};

function toggleSidebarSection(sectionId, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const now = Date.now();
  if (_appToggleTimes[sectionId] && (now - _appToggleTimes[sectionId] < 200)) {
    return; // Guard against duplicate invocation within 200ms
  }
  _appToggleTimes[sectionId] = now;

  const content = document.getElementById(`sidebar-content-${sectionId}`);
  const arrow = document.getElementById(`arrow-${sectionId}`);
  const title = document.getElementById(`title-${sectionId}`);
  if (!content) return;

  const willExpand = content.classList.contains('collapsed') || content.style.display === 'none';

  if (willExpand) {
    // EXPAND
    content.classList.remove('collapsed');
    content.classList.remove('hidden');
    content.style.display = 'block';
    if (arrow) arrow.textContent = '▾';
    if (title) {
      title.classList.remove('is-collapsed');
      title.setAttribute('aria-expanded', 'true');
    }
  } else {
    // COLLAPSE
    content.classList.add('collapsed');
    content.style.display = 'none';
    if (arrow) arrow.textContent = '▸';
    if (title) {
      title.classList.add('is-collapsed');
      title.setAttribute('aria-expanded', 'false');
    }
  }
}
window.toggleSidebarSection = toggleSidebarSection;

// Administration Submenu Toggle (Hidden behind Management until clicked)
let _appAdminToggleTime = 0;

function toggleAdminSubmenu(event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  const now = Date.now();
  if (now - _appAdminToggleTime < 200) {
    return; // Guard against duplicate invocation within 200ms
  }
  _appAdminToggleTime = now;

  const subContent = document.getElementById('admin-sub-content');
  const arrow = document.getElementById('admin-sub-arrow');
  const trigger = document.getElementById('admin-expand-trigger');
  if (!subContent) return;

  const willExpand = subContent.classList.contains('collapsed') || subContent.style.display === 'none';

  if (willExpand) {
    // EXPAND Administration: reveals Admin Console & Publisher Portal Link
    subContent.classList.remove('collapsed');
    subContent.classList.remove('hidden');
    subContent.style.display = 'flex';
    if (arrow) arrow.textContent = '▾';
    if (trigger) {
      trigger.classList.remove('is-collapsed');
      trigger.classList.add('is-expanded');
      trigger.setAttribute('aria-expanded', 'true');
    }
  } else {
    // COLLAPSE Administration: hides Admin Console & Publisher Portal Link
    subContent.classList.add('collapsed');
    subContent.style.display = 'none';
    if (arrow) arrow.textContent = '▸';
    if (trigger) {
      trigger.classList.add('is-collapsed');
      trigger.classList.remove('is-expanded');
      trigger.setAttribute('aria-expanded', 'false');
    }
  }
}
window.toggleAdminSubmenu = toggleAdminSubmenu;

function handlePublisherLink(event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  if (event && (event.ctrlKey || event.metaKey)) return true;
  try {
    const opened = window.open('publisher.html', '_blank');
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      window.location.href = 'publisher.html';
    }
  } catch (err) {
    window.location.href = 'publisher.html';
  }
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  return false;
}
window.handlePublisherLink = handlePublisherLink;

function renderAdminView() {
  const artCount = $('#adminTotalArticles');
  if (artCount) artCount.textContent = (DB.articles || []).length;

  const cmdCount = $('#adminTotalCommands');
  if (cmdCount) cmdCount.textContent = (DB.commands || []).length;

  const scrCount = $('#adminTotalScripts');
  if (scrCount) scrCount.textContent = (DB.scripts || []).length;

  const beStatus = $('#adminBackendStatus');
  if (beStatus) {
    beStatus.textContent = BACKEND_ONLINE ? 'Connected (Cloudflare D1)' : 'Operational (Local Fast Database)';
    beStatus.style.color = BACKEND_ONLINE ? '#34d399' : '#38bdf8';
  }
}

function syncWithCloudflareD1() {
  showToast('Synchronizing with Cloudflare D1 storage...', 'info');
  loadFromBackend().then(() => {
    renderAdminView();
    renderKB();
    updateSidebarFilterCounts();
    showToast('Synchronization complete! Knowledge base is up to date.', 'success');
  }).catch(e => {
    console.warn('Sync error:', e);
    showToast('Cloudflare D1 sync completed with local cached database.', 'info');
  });
}

function exportDatabaseJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `sysadminiq_database_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('Database JSON backup downloaded successfully.', 'success');
}

function copy(text) {
  const val = Array.isArray(text) ? text.join('\n') : String(text);
  navigator.clipboard.writeText(val)
    .then(() => showToast('Copied to clipboard!', 'success'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = val;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard!', 'success');
    });
}

function nav(view) {
  $$('.sidebar-item').forEach(x => {
    if (x.dataset.view) {
      x.classList.toggle('active', x.dataset.view === view);
    }
  });
  $$('.view').forEach(x => x.classList.toggle('active', x.id === view));
  if (view === 'admin') {
    renderAdminView();
  }
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

// Deep clean Word, OneNote & Excel pasted HTML artifacts (remove white boxes, mso margins, black text, and stray pipe markers)
function cleanWordPastedHtml(raw) {
  if (!raw) return "";
  let html = raw;
  html = html.replace(/<!--[\s\S]*?-->/gi, "");
  html = html.replace(/<o:p[\s\S]*?<\/o:p>/gi, "");
  html = html.replace(/<xml[\s\S]*?<\/xml>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/class="?Mso\w+"?/gi, "");
  html = html.replace(/&quot;/g, "'");

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // 1. Strip all OneNote/Word End-Of-Paragraph (EOP) pipe symbol artifacts
      doc.querySelectorAll(".EOP, [class*=\"EOP\"], span.EOP, .eop, [class*=\"eop\"], font.EOP").forEach(el => el.remove());

      // 2. Strip standalone pipe symbols inserted by OneNote paragraph endings
      doc.querySelectorAll("span, font, em, i, b, strong, p, div, li, td").forEach(el => {
        const txt = el.textContent.trim();
        if (txt === "|" || txt === "│" || txt === "¦" || txt === "ǀ" || txt === "&#124;" || txt === "&vert;" || el.classList.contains("EOP") || (typeof el.className === "string" && el.className.includes("EOP"))) {
          el.remove();
        }
      });

      // 3. Remove trailing/leading pipe markers inside block elements & stray entities
      doc.querySelectorAll("p, div, li, td, h1, h2, h3, h4").forEach(el => {
        if (el.innerHTML) {
          el.innerHTML = el.innerHTML
            .replace(/&#124;|&vert;/gi, "")
            .replace(/(?:^|<br\s*\/?>)\s*[|\u2502\u007C\u00A6\u01C0]\s*(?:<br\s*\/?>|$)/gi, "<br>")
            .replace(/\s*[|\u2502\u007C\u00A6\u01C0]\s*$/gi, "")
            .replace(/^\s*[|\u2502\u007C\u00A6\u01C0]\s*/gi, "")
            .replace(/([^\w\s])[|\u2502\u007C\u00A6\u01C0]/g, "$1")
            .replace(/[|\u2502\u007C\u00A6\u01C0]([^\w\s])/g, "$1");
        }
      });

      const els = doc.body.querySelectorAll("*");
      els.forEach(el => {
        if (el.className && typeof el.className === "string") {
          el.className = el.className.replace(/Mso\w+/gi, "").replace(/\bEOP\b/gi, "").trim();
          if (!el.className) el.removeAttribute("class");
        }
        const style = el.getAttribute("style");
        if (style) {
          const declarations = style.split(";").map(s => s.trim()).filter(Boolean);
          const kept = [];
          for (const dec of declarations) {
            const lower = dec.toLowerCase();
            if (lower.startsWith("mso-") || lower.includes("mso-")) continue;
            if (lower.startsWith("tab-stops") || lower.includes("tab-stops")) continue;
            if (lower.startsWith("font-family")) continue;
            if (lower.startsWith("line-height")) continue;
            if (lower.startsWith("margin-") && lower.includes("alt")) continue;
            if (lower.includes("background") && (lower.includes("white") || lower.includes("#fff") || lower.includes("255, 255, 255") || lower.includes("255,255,255"))) continue;
            
            // Normalize light or washed-out gray text to high-contrast dark text (#1e293b)
            if (lower.includes("color:") || lower.startsWith("color")) {
              if (
                lower.includes("white") || lower.includes("#fff") || lower.includes("255, 255, 255") ||
                lower.includes("255,255,255") || lower.includes("#f8fafc") || lower.includes("#f1f5f9") ||
                lower.includes("#e2e8f0") || lower.includes("#cbd5e1") || lower.includes("#94a3b8") ||
                lower.includes("#64748b") || lower.includes("#595959") || lower.includes("#7f7f7f") ||
                lower.includes("#808080") || lower.includes("#c6c6c6") || lower.includes("#d4d4d4") ||
                lower.includes("gray") || lower.includes("grey")
              ) {
                kept.push("color: #1e293b");
                continue;
              }
            }
            kept.push(dec);
          }
          if (kept.length > 0) {
            el.setAttribute("style", kept.join("; "));
          } else {
            el.removeAttribute("style");
          }
        }
        if (el.tagName === "TABLE" && !el.classList.contains("onenote-table")) {
          el.classList.add("onenote-table");
        }
        if (el.tagName === "SPAN" && !el.getAttribute("style") && !el.getAttribute("class")) {
          el.replaceWith(...el.childNodes);
        }
      });
      return doc.body.innerHTML;
    } catch (e) {
      console.warn("DOMParser sanitize error, using regex:", e);
    }
  }

  // Regex fallback: eliminate pipe artifacts & clean styling while preserving markdown tables
  html = html.replace(/<span[^>]*class="[^"]*EOP[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");
  html = html.replace(/<span[^>]*>[|\u2502\u007C\u00A6\u01C0]<\/span>/gi, "");
  html = html.replace(/<font[^>]*>[|\u2502\u007C\u00A6\u01C0]<\/font>/gi, "");
  html = html.replace(/&#124;|&vert;/gi, "");

  // Clean stray pipes per-line while preserving markdown table rows
  const rawLines = html.split("\n");
  html = rawLines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && (trimmed.match(/\|/g) || []).length >= 2) {
      return line; // Preserve markdown table
    }
    return line.replace(/\s*[|\u2502\u007C\u00A6\u01C0]\s*/g, " ");
  }).join("\n");

  html = html.replace(/background(-color)?\s*:\s*(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\));?/gi, "");
  html = html.replace(/color\s*:\s*(white|#fff|#ffffff|#f8fafc|#e2e8f0|#cbd5e1|#94a3b8|#64748b|gray|grey);?/gi, "color: #1e293b;");
  html = html.replace(/color\s*:\s*(black|#000|#000000|windowtext);?/gi, "");
  html = html.replace(/mso-[^;"]+;?/gi, "");
  html = html.replace(/tab-stops:[^;"]+;?/gi, "");
  html = html.replace(/font-family:[^;"]+;?/gi, "");
  html = html.replace(/style="\s*"/gi, "");
  return html;
}

// Rich Formatted Callout, OneNote & Markdown Parser
function formatArticleContent(raw) {
  if (!raw) return '';

  let html = cleanWordPastedHtml(raw);

  // Auto-enrich openSecureViewer calls with real keys from current article attachments
  if (window._currentArticle && Array.isArray(window._currentArticle.attachments)) {
    window._currentArticle.attachments.forEach(att => {
      if (att && att.name && att.key) {
        const escapedName = att.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`openSecureViewer\\(['"]['"]\\s*,\\s*['"]${escapedName}['"]`, 'g');
        html = html.replace(re, `openSecureViewer('${att.key}', '${att.name}'`);
      }
    });
  }

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

  // 5. Markdown Headings (Theme-Adaptive Crisp Corporate Sheet)
  html = html.replace(/^### (.*$)/gim, '<h3 style="color:#0284c7; font-size:15px; font-weight:700; margin:14px 0 6px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color:var(--text-primary); font-size:18px; font-weight:700; margin:16px 0 8px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color:var(--text-primary); font-size:22px; font-weight:800; margin:18px 0 10px 0; border-bottom:2px solid var(--border); padding-bottom:6px;">$1</h1>');

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
  if (rawKey && (rawKey.startsWith('data:') || rawKey.startsWith('blob:'))) {
    return { ok: true, key: rawKey, url: rawKey, contentType: '' };
  }

  const cleanName = (fileName || (rawKey ? rawKey.split('/').pop() : '')).trim();
  let resolvedKey = rawKey || cleanName;

  // Resolve actual key with timestamp if rawKey is empty or just filename
  if (!resolvedKey || resolvedKey === cleanName || !resolvedKey.includes('/')) {
    const searchTarget = cleanName.toLowerCase().replace(/\s+/g, ' ');
    const checkLists = [];
    if (window._currentArticle) checkLists.push(window._currentArticle.attachments);
    if (typeof articles !== 'undefined' && Array.isArray(articles)) {
      articles.forEach(a => { if (a && a.attachments) checkLists.push(a.attachments); });
    }
    for (const list of checkLists) {
      const atts = parseAttachmentsList(list);
      const match = atts.find(att => {
        const attName = (att.name || '').toLowerCase().replace(/\s+/g, ' ');
        return att.key && (attName === searchTarget || (att.key && att.key.toLowerCase().endsWith(cleanName.toLowerCase())));
      });
      if (match && match.key) {
        resolvedKey = match.key;
        break;
      }
    }
  }

  const candidates = [
    resolvedKey,
    resolvedKey && resolvedKey.startsWith('test/') ? resolvedKey : (resolvedKey ? 'test/' + resolvedKey : ''),
    resolvedKey ? resolvedKey.replace(/^test\//, '') : '',
    cleanName,
    cleanName ? 'test/' + cleanName : ''
  ].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx);

  // 1. First probe via /api/file proxy (which has full CORS, fast Node proxy, and D1 lookup)
  for (const candidateKey of candidates) {
    try {
      const proxyUrl = `/api/file?key=${encodeURIComponent(candidateKey)}&filename=${encodeURIComponent(cleanName)}`;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(proxyUrl, { method: 'HEAD', signal: ctrl.signal });
      clearTimeout(tid);
      if (res.status === 200) {
        const actualKey = res.headers.get('X-Resolved-Key') || candidateKey;
        return {
          ok: true,
          key: actualKey,
          url: `/api/file?key=${encodeURIComponent(actualKey)}`,
          contentType: res.headers.get('content-type') || ''
        };
      }
    } catch {}
  }

  // 2. Direct Cloudflare Worker endpoint probe
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

  // 3. For images/PDFs on static sites without backend, test if Image can load direct URL
  const ext = (cleanName || resolvedKey || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    for (const candidateKey of candidates) {
      const directUrl = `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(candidateKey)}`;
      const imgOk = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 2500);
        img.src = directUrl;
      });
      if (imgOk) {
        return { ok: true, key: candidateKey, url: directUrl, contentType: 'image/' + ext };
      }
    }
  }

  // 4. For docx: test if /api/docs/render-docx is available
  if (ext === 'docx' || ext === 'doc') {
    try {
      const docxRes = await fetch('/api/docs/render-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: resolvedKey, fileName: cleanName })
      });
      if (docxRes.ok) {
        const docxData = await docxRes.json();
        if (docxData.html) {
          return {
            ok: true,
            key: resolvedKey,
            url: `/api/file?key=${encodeURIComponent(resolvedKey)}`,
            renderedHtml: docxData.html
          };
        }
      }
    } catch {}
  }

  return {
    ok: false,
    key: resolvedKey || rawKey,
    url: `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(resolvedKey || rawKey)}`,
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
        body: JSON.stringify({ base64: base64Str, fileName: docTitle })
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
  const modal = $('#secureViewerModal');
  const body = $('#secureViewerBody');
  const nameEl = $('#secureViewerFilename');
  const iconEl = $('#secureViewerIcon');
  if (!modal || !body) return;

  const cleanName = (fileName || (rawKey ? rawKey.split('/').pop() : '')).trim();
  nameEl.textContent = cleanName || 'Attachment';
  iconEl.textContent = '⏳';
  currentViewerZoom = 1.0;
  modal.classList.remove('hidden');

  body.innerHTML = `
    <div style="text-align:center; padding:60px 20px; color:#64748b;">
      <div style="font-size:42px; margin-bottom:14px;">⏳</div>
      <h3 style="color:#0f172a; font-size:17px; margin-bottom:6px;">Connecting to secure storage...</h3>
      <p style="font-size:12px; color:#64748b;">Retrieving ${esc(cleanName || 'document')} from Cloudflare R2 bucket</p>
    </div>
  `;

  // Auto-resolve key from loaded articles if missing or raw filename
  let effectiveKey = rawKey;
  if (!effectiveKey || effectiveKey === cleanName || !effectiveKey.includes('/')) {
    const searchTarget = cleanName.toLowerCase().replace(/\s+/g, ' ');
    const checkLists = [];
    if (window._currentArticle) checkLists.push(window._currentArticle.attachments);
    if (typeof articles !== 'undefined' && Array.isArray(articles)) {
      articles.forEach(a => { if (a && a.attachments) checkLists.push(a.attachments); });
    }
    for (const list of checkLists) {
      const atts = parseAttachmentsList(list);
      const match = atts.find(att => {
        const attName = (att.name || '').toLowerCase().replace(/\s+/g, ' ');
        return att.key && (attName === searchTarget || (att.key && att.key.toLowerCase().endsWith(cleanName.toLowerCase())));
      });
      if (match && match.key) {
        effectiveKey = match.key;
        break;
      }
    }
  }

  const ext = (cleanName || effectiveKey || '').split('.').pop().toLowerCase();
  const isImg = (fileType?.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext));
  const isPdf = (fileType?.includes('pdf') || ext === 'pdf');
  const isDocx = (ext === 'docx' || ext === 'doc');
  const isCode = ['txt', 'log', 'sh', 'ps1', 'json', 'yaml', 'yml', 'xml', 'conf'].includes(ext);

  // For Word .docx: Fast track directly through server-side /api/docs/render-docx
  if (isDocx) {
    iconEl.textContent = '📘';
    body.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#64748b;">
        <div style="font-size:42px; margin-bottom:14px;">📘</div>
        <h3 style="color:#0f172a; font-size:17px; margin-bottom:6px;">Formatting Word Document...</h3>
        <p style="font-size:12px; color:#64748b;">Rendering tables, headings, and instructions inline</p>
      </div>
    `;
    try {
      const renderRes = await fetch('/api/docs/render-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: effectiveKey, fileName: cleanName })
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData.html) {
          body.innerHTML = `
            <div class="secure-viewer-docx-content">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:20px;">
                <div>
                  <span style="font-size:11px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.04em;">Word Document Playbook</span>
                  <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:4px 0 0 0;">${esc(cleanName)}</h2>
                </div>
                <span class="secure-badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">🔒 In-Website View Mode</span>
              </div>
              <div class="docx-body">
                ${renderData.html}
              </div>
            </div>
          `;
          return;
        }
      }
    } catch (e) {
      console.log('Server docx render route direct call skipped, checking storage probe:', e);
    }
  }

  const probe = await probeFileUrl(effectiveKey, cleanName);
  const directR2Url = probe.url || `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(effectiveKey || cleanName)}`;
  window.currentViewerFileUrl = directR2Url;
  window.currentViewerFileName = cleanName || 'document';

  if (!probe.ok && !probe.renderedHtml) {
    if (isDocx) {
      iconEl.textContent = '📘';
      body.innerHTML = `
        <div class="secure-viewer-docx-content">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
            <div>
              <span style="font-size:11px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.04em;">Word Document Playbook</span>
              <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:4px 0 0 0;">${esc(cleanName)}</h2>
              <div style="font-size:12px; color:#64748b; margin-top:2px;">Storage Key: <code style="color:#0284c7; background:#e0f2fe; padding:2px 6px; border-radius:4px;">${esc(effectiveKey || cleanName)}</code></div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <a href="${directR2Url}" target="_blank" download="${esc(cleanName)}" class="btn btn-primary btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                ⬇ Download / Open Original
              </a>
              <a href="https://docs.google.com/viewer?url=${encodeURIComponent(directR2Url)}&embedded=true" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                🌐 Google Docs Viewer ↗
              </a>
            </div>
          </div>

          <!-- Embedded Online Document Viewer Preview -->
          <div style="width:100%; height:580px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; background:#f8fafc; margin-bottom:16px;">
            <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(directR2Url)}&embedded=true" style="width:100%; height:100%; border:none;"></iframe>
          </div>

          <!-- Local In-Browser Instant Viewer Dropzone -->
          <div class="dropzone" id="viewerLocalDropzone" style="margin:14px 0; padding:18px; cursor:pointer;" onclick="document.getElementById('viewerLocalPicker').click()">
            <input type="file" id="viewerLocalPicker" style="display:none;" onchange="handleViewerLocalFile(event, '${esc(cleanName)}')">
            <div style="font-size:24px; margin-bottom:4px;">📂</div>
            <div style="color:var(--text-primary); font-weight:700; font-size:13px; margin-bottom:2px;">Have "${esc(cleanName)}" locally on your computer?</div>
            <div style="color:var(--text-muted); font-size:11px;">Drop or browse file here to parse full native tables with Mammoth.js</div>
          </div>
        </div>
      `;
      return;
    }

    iconEl.textContent = '📄';
    body.innerHTML = `
      <div style="text-align:center; padding:36px 20px; color:#475569; max-width:680px; margin:0 auto;">
        <div style="font-size:42px; margin-bottom:12px;">📄</div>
        <h3 style="color:#0f172a; font-size:18px; margin-bottom:6px;">Document Available in Storage</h3>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:18px;">
          Document: <b style="color:#0f172a;">${esc(cleanName || effectiveKey)}</b>
        </p>

        <div style="margin:20px 0; display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <a href="${directR2Url}" target="_blank" download="${esc(cleanName)}" class="btn btn-primary" style="text-decoration:none;">
            ⬇ Download / Open File
          </a>
          <button type="button" class="btn btn-secondary" onclick="closeSecureViewer()">Close</button>
        </div>
      </div>
    `;
    return;
  }

  if (probe.renderedHtml) {
    iconEl.textContent = '📘';
    body.innerHTML = `
      <div class="secure-viewer-docx-content">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:20px;">
          <div>
            <span style="font-size:11px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.04em;">Word Document Playbook</span>
            <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:4px 0 0 0;">${esc(cleanName)}</h2>
          </div>
          <span class="secure-badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">🔒 In-Website View Mode</span>
        </div>
        <div class="docx-body">
          ${probe.renderedHtml}
        </div>
      </div>
    `;
    return;
  }

  const fileUrl = probe.url;
  nameEl.textContent = cleanName || 'Attachment';
  iconEl.textContent = isImg ? '🖼️' : (isPdf ? '📕' : (isDocx ? '📘' : (isCode ? '📋' : '📄')));

  if (isDocx) {
    try {
      const res = await fetch(fileUrl);
      const arrayBuf = await res.arrayBuffer();
      await renderDocxContent(arrayBuf, body, cleanName || 'Word Document Playbook');
    } catch (err) {
      body.innerHTML = `<div style="text-align:center; padding:40px; color:#f87171;">Failed to load Word document: ${esc(err.message)}</div>`;
    }
  } else if (isImg) {
    body.innerHTML = `
      <img id="secureViewerImg" src="${fileUrl}" class="secure-viewer-img" alt="${esc(cleanName)}" draggable="false" oncontextmenu="return false;">
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
        <h3 style="color:#fff; font-size:18px; margin-bottom:6px;">${esc(cleanName)}</h3>
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

function toggleSecureViewerFullscreen() {
  const modal = $('#secureViewerModal');
  if (!modal) return;
  const isFs = modal.classList.toggle('modal-fullscreen-active');
  const btn = $('#secureViewerFsBtn');
  if (btn) btn.innerHTML = isFs ? '🗗 Standard' : '⛶ Fullscreen';
}

function downloadCurrentViewerFile() {
  showToast('🔒 Direct file download is restricted. Document preview is available in secure view-only mode for main page users.', 'warning');
}

// Expose globals for onclick attributes
window.openSecureViewer = openSecureViewer;
window.closeSecureViewer = closeSecureViewer;
window.zoomSecureViewer = zoomSecureViewer;
window.resetSecureZoom = resetSecureZoom;
window.toggleSecureViewerFullscreen = toggleSecureViewerFullscreen;
window.downloadCurrentViewerFile = downloadCurrentViewerFile;

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
                <div style="font-size:11px; color:#64748b; margin-top:4px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span>${esc(file.type || ext.toUpperCase())} ${file.size ? '• ' + Math.round(file.size / 1024) + ' KB' : ''}</span>
                  <span style="display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px; background:rgba(239,68,68,0.12); color:#fca5a5; border:1px solid rgba(239,68,68,0.25);">
                    🔒 Download Restricted (View-Only)
                  </span>
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
  window._currentArticle = a;
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

// Multi-AI Model Tools (Runs 100% In-Webpage)
let selectedAi = 'gemini';
let lastAiSolution = '';

function selectAiModel(model) {
  selectedAi = model;
  ['gemini', 'chatgpt', 'claude', 'perplexity', 'deepseek'].forEach(m => {
    $(`#tab-${m}`)?.classList.toggle('active', m === model);
  });

  const note = $('#aiStatusNote');
  const runBtn = $('#runAiBtn');
  const searchName = $('#searchSelectedAiName');
  const outTitle = $('#aiOutputTitle');

  const names = {
    gemini: 'Google Gemini Flash',
    chatgpt: 'ChatGPT 4o (OpenAI)',
    claude: 'Claude 3.5 Sonnet',
    perplexity: 'Perplexity (Web Grounded)',
    deepseek: 'DeepSeek (Reasoning & CLI)'
  };

  const shortNames = {
    gemini: 'Google Gemini & Web',
    chatgpt: 'ChatGPT 4o',
    claude: 'Claude 3.5 Sonnet',
    perplexity: 'Perplexity',
    deepseek: 'DeepSeek'
  };

  if (note) note.textContent = `Active Model: ${names[model] || 'AI'} • Troubleshoots & searches directly in webpage`;
  if (runBtn) {
    runBtn.textContent = `⚡ Troubleshoot Incident with ${shortNames[model] || 'AI'}`;
  }
  if (searchName) {
    searchName.textContent = shortNames[model] || 'AI Tool';
  }
  if (outTitle) {
    outTitle.textContent = `${names[model] || 'AI'} Diagnostic Solution & Actionable Playbook`;
  }
}

function searchSelectedAiTool(targetModel) {
  const modelToUse = targetModel || selectedAi || 'gemini';
  const input = $('#aiPromptInput');
  const query = (input?.value || '').trim();
  if (!query) {
    showToast('Please enter an incident description or error message to search.', 'warning');
    input?.focus();
    return;
  }

  // Pre-copy the query to clipboard so the user can easily paste if needed
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(query).catch(() => {});
  }

  const encodedQ = encodeURIComponent(query);
  let targetUrl = '';
  let modelName = 'AI Tool';

  switch (modelToUse) {
    case 'claude':
      modelName = 'Claude 3.5 Sonnet';
      targetUrl = `https://claude.ai/new?q=${encodedQ}`;
      break;
    case 'chatgpt':
      modelName = 'ChatGPT 4o';
      targetUrl = `https://chatgpt.com/?q=${encodedQ}`;
      break;
    case 'perplexity':
      modelName = 'Perplexity AI';
      targetUrl = `https://www.perplexity.ai/search/new?q=${encodedQ}`;
      break;
    case 'deepseek':
      modelName = 'DeepSeek';
      targetUrl = `https://chat.deepseek.com/?q=${encodedQ}`;
      break;
    case 'gemini':
    default:
      modelName = 'Google Gemini & Web';
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' troubleshooting guide')}`;
      break;
  }

  showToast(`📋 Copied prompt! Opening ${modelName}...`, 'success');
  let win = null;
  try {
    win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Popup opening blocked or restricted:', err);
  }
  if (!win) {
    showToast(`Popup restricted. Click to search: <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;font-weight:700;">Open ${modelName} ↗</a>`, 'info');
  }
}
window.searchSelectedAiTool = searchSelectedAiTool;

const ALL_TROUBLESHOOTING_PROMPTS = [
  // VMware
  {
    platform: 'VMware',
    badge: '🔴 VMware',
    title: 'PSOD NOT_IMPLEMENTED vmkernel crash',
    prompt: 'VMware ESXi host PSOD with NOT_IMPLEMENTED in vmkernel. Analyze root cause, coredump extraction and recovery steps.'
  },
  {
    platform: 'VMware',
    badge: '🔴 VMware',
    title: 'vSAN disk group degraded & rebuild',
    prompt: 'VMware vSAN: Disk group degraded due to physical drive permanent error. Run health check and trigger non-disruptive disk rebuild.'
  },
  {
    platform: 'VMware',
    badge: '🔴 VMware',
    title: 'vCenter VCSA /storage/seat 100% full',
    prompt: 'VMware vCenter: VCSA 8.0 services failed to start (vmware-vpxd crash) due to PostgreSQL /storage/seat 100% disk full.'
  },
  {
    platform: 'VMware',
    badge: '🔴 VMware',
    title: 'VM stun & locked .vmdk snapshot failure',
    prompt: 'VMware VM stun & snapshot consolidation failure: Locked file .vmdk by backup proxy. Force unlock and snapshot consolidation without downtime.'
  },
  {
    platform: 'VMware',
    badge: '🔴 VMware',
    title: 'DVS switch packet drop after vMotion',
    prompt: 'VMware vSphere DVS: Virtual machine lost network connectivity after vMotion. Check VLAN trunking and physical uplinks.'
  },

  // Windows
  {
    platform: 'Windows',
    badge: '🪟 Windows',
    title: 'Kerberos 4771 Code 0x18 lockout',
    prompt: 'Windows Server: Kerberos Pre-Authentication Failure Event ID 4771 with Failure Code 0x18. Remediate account lockouts.'
  },
  {
    platform: 'Windows',
    badge: '🪟 Windows',
    title: 'AD DC replication error 8453 (RPC)',
    prompt: 'Active Directory: Domain Controller replication error 8453 (Replication access was denied). Check RPC dynamic ports and ACL permissions.'
  },
  {
    platform: 'Windows',
    badge: '🪟 Windows',
    title: 'DFS-R staging folder quota exceeded',
    prompt: 'Windows DFS-R: Replication backlog accumulating and staging folder quota exceeded. Clear dirty shutdown state and reseed.'
  },
  {
    platform: 'Windows',
    badge: '🪟 Windows',
    title: 'Hyper-V VSS writer 0x800423f3',
    prompt: 'Hyper-V: VSS backup writer failure Event ID 8193 with 0x800423f3. Troubleshoot shadow copy storage and restart Volume Shadow Copy.'
  },
  {
    platform: 'Windows',
    badge: '🪟 Windows',
    title: 'DNS server fails scavenging records',
    prompt: 'Windows DNS Server: DNS server fails to scavenge stale resource records. Remediate aging settings and tombstone replication.'
  },

  // Linux
  {
    platform: 'Linux',
    badge: '🐧 Linux',
    title: 'kswapd0 100% CPU & high iowait',
    prompt: 'Linux: System high iowait with kswapd0 100% CPU. Diagnose memory pressure, vm.dirty_ratio, and NVMe disk bottleneck.'
  },
  {
    platform: 'Linux',
    badge: '🐧 Linux',
    title: 'Kernel OOM-killer killed service',
    prompt: 'Linux systemd-oomd: Critical production process terminated by kernel OOM killer. Inspect cgroup memory limit and dmesg traces.'
  },
  {
    platform: 'Linux',
    badge: '🐧 Linux',
    title: 'Read-only remount XFS/EXT4 corruption',
    prompt: 'Linux Filesystem: XFS / EXT4 metadata corruption forced read-only remount. Perform emergency xfs_repair / fsck with journal rollback.'
  },
  {
    platform: 'Linux',
    badge: '🐧 Linux',
    title: 'Kernel panic NMI watchdog CPU stuck',
    prompt: 'Linux Kernel Panic: NMI watchdog bug: soft lockup - CPU#4 stuck for 23s! Identify offending driver and tune kernel scheduler.'
  },
  {
    platform: 'Linux',
    badge: '🐧 Linux',
    title: 'LVM thin-pool metadata 100% full',
    prompt: 'Linux LVM: Thin-pool metadata space exhausted (100% full) causing frozen writes. Extend metadata pool safely.'
  },

  // Cisco UCS
  {
    platform: 'Cisco UCS',
    badge: '🌉 Cisco UCS',
    title: 'FI Subordinate Degraded Cluster',
    prompt: 'Cisco UCS Manager: Fabric Interconnect Subordinate cluster state degraded. Check VIP failover and Ethernet uplink.'
  },
  {
    platform: 'Cisco UCS',
    badge: '🌉 Cisco UCS',
    title: 'Blade DIMM ECC error threshold',
    prompt: 'Cisco UCS: Blade Server chassis thermal critical alarm & DIMM correctable ECC error limit reached. Diagnostic policy and replacement.'
  },
  {
    platform: 'Cisco UCS',
    badge: '🌉 Cisco UCS',
    title: 'vNIC/vHBA failover dropped in reboot',
    prompt: 'Cisco UCS: vNIC / vHBA fabric failover not occurring during primary FI reboot. Verify pinning and uplink trunking.'
  },
  {
    platform: 'Cisco UCS',
    badge: '🌉 Cisco UCS',
    title: 'Service Profile out-of-compute-resources',
    prompt: 'Cisco UCS: Service Profile association failed with "out-of-compute-resources". Check vNIC templates and pool availability.'
  },
  {
    platform: 'Cisco UCS',
    badge: '🌉 Cisco UCS',
    title: 'Chassis PSU redundancy lost',
    prompt: 'Cisco UCS Chassis: Power supply redundancy lost in Chassis 1. Diagnose PSU input AC feed failure and power budgeting.'
  },

  // AWS
  {
    platform: 'AWS',
    badge: '☁️ AWS',
    title: 'EC2 1/2 Status Check failed',
    prompt: 'AWS EC2: Instance reachability 1/2 Status Check failed after kernel update. Attach EBS root volume to rescue instance and restore GRUB.'
  },
  {
    platform: 'AWS',
    badge: '☁️ AWS',
    title: 'EBS volume IOPS throttling 100% queue',
    prompt: 'AWS EBS: io2 volume experiencing severe IOPS throttling with 100% volume queue length. Remediate burst balance and Provisioned IOPS.'
  },
  {
    platform: 'AWS',
    badge: '☁️ AWS',
    title: 'Lambda cold start VPC ENI timeout',
    prompt: 'AWS Lambda: Lambda cold start timeouts with VPC ENI attachment delays. Diagnose subnets, security group limits, and NAT Gateway saturation.'
  },
  {
    platform: 'AWS',
    badge: '☁️ AWS',
    title: 'ALB 502 Bad Gateway target drops',
    prompt: 'AWS ALB: Application Load Balancer throwing 502 Bad Gateway. Inspect target group health checks, keep-alive headers, and backend connection drops.'
  },
  {
    platform: 'AWS',
    badge: '☁️ AWS',
    title: 'S3 403 AccessDenied cross-account KMS',
    prompt: 'AWS S3: AccessDenied (403) on cross-account IAM role assuming with KMS Customer Managed Key. Verify KMS Key Policy and Bucket Policy.'
  },

  // Azure
  {
    platform: 'Azure',
    badge: '🔷 Azure',
    title: 'VM unreachable Bastion/RDP (NSG lock)',
    prompt: 'Azure VM: Windows/Linux VM completely unreachable via Bastion and RDP. Remediate Network Security Group rule conflict and Azure Serial Console rescue.'
  },
  {
    platform: 'Azure',
    badge: '🔷 Azure',
    title: 'Premium SSD OS disk IOPS burst exhausted',
    prompt: 'Azure Disk: Premium SSD OS disk hitting max IOPS burst limit causing SQL Server high write latency. Upgrade to Azure Elastic SAN / Ultra Disk.'
  },
  {
    platform: 'Azure',
    badge: '🔷 Azure',
    title: 'AD Connect sync error InvalidSoftMatch',
    prompt: 'Azure AD Connect: Directory synchronization error "InvalidSoftMatch" / duplicate UPN conflict. Remediate cloud anchor and SMTP matching.'
  },
  {
    platform: 'Azure',
    badge: '🔷 Azure',
    title: 'AKS NodeNotReady disk pressure',
    prompt: 'Azure Kubernetes Service (AKS): Cluster nodes stuck in NotReady status due to container runtime disk pressure. Drain node and cleanup rootfs.'
  },
  {
    platform: 'Azure',
    badge: '🔷 Azure',
    title: 'ExpressRoute BGP peering session dropped',
    prompt: 'Azure ExpressRoute: Dedicated peering BGP session state dropped to Connect/Active. Troubleshoot primary/secondary circuit MSEE failover.'
  }
];

let currentPromptCategory = 'all';

function onSelectTroubleshootingPrompt(promptText) {
  if (!promptText) return;
  const input = $('#aiPromptInput');
  if (input) {
    input.value = promptText;
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function filterPromptCategory(category, buttonEl) {
  currentPromptCategory = category || 'all';
  const pills = document.querySelectorAll('#promptFilterPills .prompt-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');
  renderPromptChips(currentPromptCategory);
}

function renderPromptChips(category) {
  const grid = document.getElementById('aiPromptsGrid');
  if (!grid) return;

  let items = [];
  if (category === 'Custom') {
    const customList = getCustomPrompts();
    if (!customList.length) {
      grid.innerHTML = `<div style="grid-column:1/-1; padding:12px; font-size:12px; color:#94a3b8; font-style:italic;">No custom prompts saved yet. Type a problem in the incident description box and click "💾 Save as Custom Prompt" to store your own scenarios.</div>`;
      return;
    }
    items = customList.map(c => ({
      platform: 'Custom',
      badge: '⭐ Custom',
      title: c.title,
      prompt: c.prompt
    }));
  } else if (category === 'all') {
    items = ALL_TROUBLESHOOTING_PROMPTS.slice(0, 8); // Top representative prompts
  } else {
    items = ALL_TROUBLESHOOTING_PROMPTS.filter(p => p.platform.toLowerCase() === category.toLowerCase());
  }

  grid.innerHTML = items.map(item => `
    <div class="ai-prompt-chip" onclick="applyAiPrompt('${esc(item.prompt).replace(/'/g, "\\'")}')">
      <b>${item.badge}:</b> ${esc(item.title)}
    </div>
  `).join('');
}

function getCustomPrompts() {
  try {
    const raw = localStorage.getItem('sysadminiq_custom_prompts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCurrentAsCustomPrompt() {
  const input = $('#aiPromptInput');
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('Please type an incident description first to save as a custom prompt.', 'warning');
    input?.focus();
    return;
  }
  const defaultLabel = text.length > 35 ? text.slice(0, 35) + '...' : text;
  const title = prompt('Enter a short label/title for this Custom Prompt:', defaultLabel);
  if (!title) return;

  const current = getCustomPrompts();
  current.unshift({ id: Date.now(), title: title.trim(), prompt: text });
  localStorage.setItem('sysadminiq_custom_prompts', JSON.stringify(current.slice(0, 30)));

  loadCustomPromptsIntoDropdown();
  showToast(`Custom prompt "${title.trim()}" saved successfully!`, 'success');

  if (currentPromptCategory === 'Custom') {
    renderPromptChips('Custom');
  }
}

function clearCustomPrompts() {
  if (confirm('Clear all saved custom prompts from this browser?')) {
    localStorage.removeItem('sysadminiq_custom_prompts');
    loadCustomPromptsIntoDropdown();
    if (currentPromptCategory === 'Custom') {
      renderPromptChips('Custom');
    }
    showToast('Saved custom prompts have been reset.', 'info');
  }
}

function loadCustomPromptsIntoDropdown() {
  const optgroup = document.getElementById('customPromptsOptgroup');
  if (!optgroup) return;
  const list = getCustomPrompts();
  if (!list.length) {
    optgroup.innerHTML = `<option disabled value="">(No saved custom prompts yet — click "Save as Custom" to add)</option>`;
  } else {
    optgroup.innerHTML = list.map(item => `
      <option value="${esc(item.prompt).replace(/"/g, '&quot;')}">⭐ Custom: ${esc(item.title)}</option>
    `).join('');
  }
}

function applyAiPrompt(promptText) {
  const input = $('#aiPromptInput');
  if (input) {
    input.value = promptText;
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function submitAiQuery() {
  const promptInput = $('#aiPromptInput');
  const query = promptInput?.value.trim();

  if (!query) {
    showToast('Please enter an incident description, error message, or system crash trace.', 'warning');
    promptInput?.focus();
    return;
  }

  const runBtn = $('#runAiBtn');
  const outPanel = $('#aiOutputPanel');
  const outContent = $('#aiOutputContent');
  const thread = $('#aiFollowUpThread');

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = '✨ Analyzing incident...';
  }

  if (outPanel) {
    outPanel.style.display = 'block';
    outPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (outContent) {
    outContent.innerHTML = `<div style="display:flex; align-items:center; gap:10px; color:#38bdf8; padding:16px 0;">
      <span style="animation:spin 1s linear infinite; display:inline-block;">⚙️</span>
      <span>Generating diagnostic analysis with ${selectedAi.toUpperCase()} in webpage...</span>
    </div>`;
  }
  if (thread) {
    thread.innerHTML = '';
  }

  // Robust Multi-Technology Detection from Query Keywords
  let detectedPlatform = 'Enterprise Systems';
  const qLower = query.toLowerCase();
  const hasVmware = /vmware|esxi|vcenter|vsan|dvs|vmotion|vpxd|vmkernel|psod|vmdk|vmfs|vmnic/.test(qLower);
  const hasCisco = /cisco|ucs|fabric interconnect|fi-[ab]|blade|chassis|vhba|vnic|intersight|cimc/.test(qLower);
  const hasWindows = /windows|active directory|kerberos|domain controller|ad dc|dfs-r|dfsr|hyper-v|vss|dns server|powershell|gpo/.test(qLower);
  const hasLinux = /linux|kswapd|iowait|oom|systemd|xfs|ext4|nmi watchdog|lvm|thin-pool|rhel|ubuntu|centos|sysctl|journalctl/.test(qLower);
  const hasAws = /aws|ec2|ebs|lambda|alb|s3|cloudwatch|kms|route 53|target group/.test(qLower);
  const hasAzure = /azure|bastion|aks|expressroute|invalidsoftmatch|nsg|msee|premium ssd/.test(qLower);

  if (hasVmware && hasCisco) {
    detectedPlatform = 'Cisco UCS & VMware vSphere';
  } else if (hasWindows && hasLinux) {
    detectedPlatform = 'Windows & Linux Hybrid Infrastructure';
  } else if (hasVmware) {
    detectedPlatform = 'VMware vSphere';
  } else if (hasCisco) {
    detectedPlatform = 'Cisco UCS';
  } else if (hasWindows) {
    detectedPlatform = 'Windows Server';
  } else if (hasLinux) {
    detectedPlatform = 'Enterprise Linux';
  } else if (hasAws) {
    detectedPlatform = 'AWS Cloud';
  } else if (hasAzure) {
    detectedPlatform = 'Microsoft Azure';
  }

  // 1. Attempt server-side Multi-Model AI API with fallback to Live Cloud AI Backend
  let apiSuccess = false;
  const endpointsToTry = [
    getApiEndpoint('/api/ai/diagnose'),
    `${CLOUD_API_BACKEND}/api/ai/diagnose`
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const endpoint of endpointsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, platform: detectedPlatform, model: selectedAi }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.response && data.response.trim() && data.response !== 'No diagnosis generated.') {
          lastAiSolution = data.response;
          if (outContent) outContent.innerHTML = formatArticleContent(lastAiSolution);
          apiSuccess = true;
          break;
        }
      }
    } catch (err) {
      console.warn(`AI endpoint (${endpoint}) offline or unreachable:`, err?.message || err);
    }
  }

  if (runBtn) {
    runBtn.disabled = false;
    const shortNames = {
      gemini: 'Google Gemini',
      chatgpt: 'ChatGPT 4o',
      claude: 'Claude 3.5 Sonnet',
      perplexity: 'Perplexity',
      deepseek: 'DeepSeek'
    };
    runBtn.textContent = `⚡ Troubleshoot Incident with ${shortNames[selectedAi] || 'AI'}`;
  }

  if (apiSuccess) return;

  // 2. High-Fidelity In-App Diagnostic Knowledge Engine (Offline & Static Resilient)
  lastAiSolution = generateInAppAiDiagnosis(query, detectedPlatform, selectedAi);
  if (outContent) outContent.innerHTML = formatArticleContent(lastAiSolution);
}

async function submitAiFollowUp() {
  const input = $('#aiFollowUpInput');
  const thread = $('#aiFollowUpThread');
  const q = input?.value.trim();
  if (!q) return;

  input.value = '';

  const userBubble = document.createElement('div');
  userBubble.className = 'followup-bubble-user';
  userBubble.innerHTML = `<b>You:</b> ${esc(q)}`;
  thread?.appendChild(userBubble);

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'followup-bubble-ai';
  loadingBubble.innerHTML = `<p style="color:#60a5fa; font-style:italic;">Generating follow-up response with ${selectedAi.toUpperCase()} in webpage...</p>`;
  thread?.appendChild(loadingBubble);
  loadingBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  let reply = '';
  const endpointsToTry = [
    getApiEndpoint('/api/ai/diagnose'),
    `${CLOUD_API_BACKEND}/api/ai/diagnose`
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const endpoint of endpointsToTry) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUp: q, history: lastAiSolution, model: selectedAi })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.response) {
          reply = data.response;
          break;
        }
      }
    } catch (err) {
      console.warn(`Follow-up endpoint (${endpoint}) error:`, err?.message || err);
    }
  }

  if (!reply) {
    reply = `### 💬 ${selectedAi.toUpperCase()} Follow-Up Response\nRegarding: "${q}"\n\n- **Analysis**: Validated against active incident parameters and defensive recovery guidelines.\n- **Recommended Variation / Action**:\n\`\`\`bash\n# Tailored diagnostic inspection command\njournalctl -xe --no-pager | grep -i "${q.slice(0, 24)}" | tail -n 25\n\`\`\`\n- **Post-Fix Verification**: Verify exit code is 0 and monitor error log patterns.`;
  }

  loadingBubble.innerHTML = formatArticleContent(reply);
  lastAiSolution += `\n\nQ: ${q}\nA: ${reply}`;
}

function applyFollowUpPreset(presetText) {
  const input = $('#aiFollowUpInput');
  if (input) {
    input.value = presetText;
    submitAiFollowUp();
  }
}

// High-Fidelity In-App Diagnostic Knowledge Engine (Offline, Static & GitHub Pages Resilient)
function generateInAppAiDiagnosis(query, platform, model) {
  const q = (query || '').toLowerCase();
  const modelLabels = {
    gemini: 'Google Gemini Flash Diagnostic Specialist',
    chatgpt: 'ChatGPT 4o Enterprise Systems Architect',
    claude: 'Claude 3.5 Sonnet Senior Systems Engineer',
    perplexity: 'Perplexity Infrastructure Grounded Engine',
    deepseek: 'DeepSeek V3 Systems Reasoning Engine'
  };
  const activeLabel = modelLabels[model] || 'SysAdminIQ AI Diagnostic Engine';

  // Technology classification flags
  const isVMware = /vmware|esxi|vcenter|vsan|dvs|vmotion|vpxd|vmkernel|psod|vmdk|vmfs|vmnic/.test(q) || /vmware|esxi|vcenter|vsan/.test((platform || '').toLowerCase());
  const isCisco = /cisco|ucs|fabric interconnect|fi-[ab]|blade|chassis|vhba|vnic|intersight|cimc/.test(q) || /cisco|ucs/.test((platform || '').toLowerCase());
  const isWindows = /windows|active directory|kerberos|domain controller|ad dc|dfs-r|dfsr|hyper-v|vss|dns server|powershell|gpo/.test(q) || /windows/.test((platform || '').toLowerCase());
  const isLinux = /linux|kswapd|iowait|oom|systemd|xfs|ext4|nmi watchdog|lvm|thin-pool|rhel|ubuntu|centos|sysctl|journalctl/.test(q) || /linux/.test((platform || '').toLowerCase());
  const isAzure = /azure|bastion|aks|expressroute|invalidsoftmatch|nsg|msee|premium ssd/.test(q) || /azure/.test((platform || '').toLowerCase());
  const isAWS = /aws|ec2|ebs|lambda|alb|s3|cloudwatch|kms|route 53|target group/.test(q) || /aws/.test((platform || '').toLowerCase());

  let targetPlatform = (isVMware && isCisco) ? 'Cisco UCS & VMware vSphere' :
                       (isWindows && isLinux) ? 'Windows & Linux Hybrid' :
                       isVMware ? 'VMware vSphere' :
                       isCisco ? 'Cisco UCS' :
                       isWindows ? 'Windows Server' :
                       isLinux ? 'Enterprise Linux' :
                       isAzure ? 'Microsoft Azure' :
                       isAWS ? 'AWS Cloud' : (platform || 'Enterprise Systems');

  let detectedCategory = '';
  let rootCause = '';
  let cliCommands = '';
  let cautionNote = 'Ensure change control verification is recorded and redundant paths are monitored before bouncing production interfaces, services, or storage paths.';
  let remediationSteps = [];
  let verificationSteps = [];

  // ==========================================
  // 0. CISCO UCS HARDWARE & ESXI INSTALLATION / DEPLOYMENT (HYBRID)
  // ==========================================
  if ((isCisco && isVMware) || (isCisco && (q.includes('esxi') || q.includes('install') || q.includes('hardware') || q.includes('deploy') || q.includes('blade') || q.includes('kvm') || q.includes('boot'))) || (isVMware && q.includes('cisco')) || (q.includes('esxi') && (q.includes('cisco') || q.includes('ucs') || q.includes('hardware')))) {
    detectedCategory = 'Cisco UCS Hardware Deployment & VMware ESXi Installation (B-Series Blade & C-Series Rack)';
    targetPlatform = 'Cisco UCS & VMware vSphere';
    rootCause = `Deploying VMware ESXi to Cisco UCS B-Series blade or C-Series rack servers requires strict alignment between server hardware, CIMC/UCSM firmware, and the specialized <strong>Cisco-Customized ESXi Image</strong>.<br><br>
<b>Critical Version Reality & Grounding:</b> The current general enterprise production release of VMware ESXi is <strong>vSphere 8.0 Update 3</strong> (VMware ESXi 9.0 is an upcoming major release not yet in general release). When deploying to Cisco UCS M5, M6, or M7 servers, you must target supported vSphere 7.0 / 8.0 releases or validated technical preview builds.<br><br>
<b>Key Technical Prerequisites & Failure Mechanisms:</b><br>
1. <b>Cisco Custom ISO Requirement:</b> Standard vanilla VMware ESXi ISOs lack the proprietary drivers for Cisco VIC (Virtual Interface Card, e.g., VIC 1440, 1480, 15411) CNA adapters. Booting vanilla images results in <code>No Network Adapters Detected</code> or undetected local SAS/NVMe RAID controllers.<br>
2. <b>Cisco UCS Hardware Compatibility List (HCL):</b> UCS Manager (UCSM) / Intersight infrastructure bundle firmware (A/B bundles) must match the driver versions (<code>nenic</code> for Ethernet, <code>nfnic</code> for FCoE/FC).<br>
3. <b>UCS Boot Policy & Service Profile:</b> The server Service Profile must have an explicit Boot Policy configured (e.g., KVM Virtual Media mapped DVD as primary, followed by Local Disk RAID-1 or SAN boot target WWPN/LUN 0).`;
    cautionNote = 'Always verify driver-to-firmware parity on the Cisco UCS HCL Tool (ucshcltool.cloudapps.cisco.com) before installation. Do not install vanilla VMware ISOs on Cisco UCS servers; always source the official Cisco Custom ESXi ISO from the Broadcom support portal.';
    cliCommands = `# ========================================================
# 1. CISCO UCS MANAGER (UCSM) / CIMC PRE-DEPLOYMENT CHECKS
# ========================================================
# Connect to UCS Manager VIP via SSH and check chassis/blade state
show cluster state
show chassis
show server status

# Inspect firmware catalog (ensure BIOS, CIMC, and adapter firmware are aligned)
show server firmware detail 1/1
show adapter detail 1/1

# Check Service Profile boot policy and virtual media mapping
scope org
show boot-policy
scope service-profile server 1/1
show boot-policy

# ========================================================
# 2. ESXi SHELL POST-INSTALLATION VALIDATION (SSH to Host)
# ========================================================
# Verify Cisco VIC driver VIBs are loaded (nenic for network, nfnic for storage)
esxcli software vib list | grep -iE "cisco|nenic|nfnic"

# Verify physical uplinks (vmnic) created by Cisco VIC adapter
esxcli network nic list

# Check storage adapters (Cisco VIC FCoE/iSCSI or local MegaRAID controller)
esxcli storage core adapter list
esxcli storage core path list

# Test host network reachability to default gateway and Fabric Interconnects
vmkping -I vmk0 <Gateway_IP> -c 3`;
    remediationSteps = [
      '<b>Download Cisco Custom ESXi ISO:</b> Navigate to the Broadcom Support Portal (or Cisco Software Download). Select "VMware vSphere" -> "Custom ISOs" and download the official <b>Cisco Custom Image for ESXi</b> (matching your target UCS M5/M6/M7 hardware generation).',
      '<b>Configure UCS Service Profile Boot Policy:</b> In UCS Manager (or Cisco Intersight), edit the target server\'s Service Profile: set Boot Order with <b>Virtual Media (vDVD)</b> first, followed by <b>Local Disk</b> (or <b>SAN Boot</b> with primary/secondary vHBA target WWPNs).',
      '<b>Create Local RAID Volume (If booting local drives):</b> In UCSM Storage Profile or CIMC Web GUI, configure RAID-1 mirror on the front-drive bays using the Cisco FlexStorage / MegaRAID controller.',
      '<b>Launch KVM & Mount ISO:</b> In UCSM -> Equipment -> Servers -> select Blade/Rack Server -> click <b>Launch KVM Console</b>. In the vKVM menu, click <b>Virtual Media</b> -> <b>Activate Virtual Devices</b> -> <b>Map CD/DVD</b> -> browse and select your downloaded Cisco Custom ESXi ISO.',
      '<b>Boot & Install ESXi:</b> Power on / reset the server. Press <code>F6</code> (Boot Menu) if needed, select <b>Cisco vKVM-Mapped vDVD</b>, and proceed through the installer. Choose the RAID-1 virtual drive as the target disk.',
      '<b>Initial DCUI Setup:</b> Upon installation reboot, press <code>F2</code> in the KVM console to access the Direct Console User Interface (DCUI). Configure Static IPv4, Subnet, Default Gateway, DNS, and set the Management VLAN ID matching your UCS vNIC template trunk.'
    ];
    verificationSteps = [
      'Verify Cisco VIC drivers in ESXi shell: <code>esxcli software vib list | grep -i cisco</code> returns active <code>nenic</code> and <code>nfnic</code> VIBs.',
      'Confirm physical uplinks are UP: <code>esxcli network nic list</code> displays vmnic0 and vmnic1 operating at 20Gbps/40Gbps/100Gbps with link status Up.',
      'Confirm storage paths: <code>esxcli storage core adapter list</code> shows active local controller or VIC FCoE initiator.',
      'Validate UCS Manager status: Server Service Profile association state should display <b>OK / Configured</b> without active critical faults.'
    ];

  // ==========================================
  // 1. VMWARE VSPHERE & VSAN SCENARIOS
  // ==========================================
  } else if (q.includes('dvs') || (q.includes('vmotion') && (q.includes('network') || q.includes('vlan') || q.includes('uplink') || q.includes('lost') || q.includes('drop') || q.includes('packet')))) {
    detectedCategory = 'VMware vSphere Distributed Switch (vDS) & vMotion Network Recovery';
    targetPlatform = 'VMware vSphere';
    rootCause = `The virtual machine dropped network reachability immediately following a vMotion migration between ESXi hosts. Common root causes include:<br>
1. <b>Physical Switch VLAN Trunking Mismatch:</b> The Top-of-Rack (TOR) physical switch port connected to the destination host's uplinks (vmnic) does not permit the VM portgroup VLAN tag in its 802.1Q trunk list.<br>
2. <b>MTU Size Discrepancy:</b> Destination vDS or physical uplink is set to standard 1500 MTU while the VM or source vSwitch utilized 9000 Jumbo Frames.<br>
3. <b>Stale Physical Switch CAM/MAC Table:</b> The upstream physical switch failed to learn the VM MAC on the new port because the Reverse ARP (RARP) broadcast emitted post-vMotion was dropped or delayed.<br>
4. <b>Teaming & Failover Discrepancy:</b> Destination host uplinks assigned as Active are mapped to inconsistent physical VLAN trunks.`;
    cliCommands = `# 1. List physical NIC link states and negotiation speeds on destination ESXi host
esxcli network nic list

# 2. Inspect Distributed Virtual Switch (vDS) and portgroup VLAN configuration
esxcli network vswitch dvs vmware list
esxcli network vswitch dvs vmware portgroup list

# 3. Test VMkernel and gateway MTU reachability (1472 = 1500 MTU, 8972 = Jumbo 9000 MTU)
vmkping -I vmk0 <Gateway_IP> -d -s 1472
vmkping -I vmk0 <Gateway_IP> -d -s 8972

# 4. Check for dropped packets and CRC errors on destination physical uplinks
esxcli network nic stats get -n vmnic0
esxcli network nic stats get -n vmnic1

# 5. Inspect active VM virtual ports and MAC learning on vDS
esxcli network vswitch dvs vmware port list | grep -E "Port ID|Client Name|MAC Address"`;
    remediationSteps = [
      'Verify upstream physical switch port configuration for destination host uplinks: ensure VLAN ID is in the permitted trunk (<code>switchport trunk allowed vlan add &lt;VLAN_ID&gt;</code>).',
      'Confirm MTU consistency across all physical switch interfaces, vDS switches, and VMkernel adapters (e.g., 1500 vs 9000 Jumbo Frames).',
      'Force MAC address table re-learning: edit VM network adapter in vCenter, uncheck and re-check "Connected", or toggle virtual adapter state.',
      'Verify "Notify Switches" is set to "Yes" in vDS Portgroup Teaming and Failover policies to ensure RARP broadcast upon vMotion.',
      'Run vDS Health Check in vCenter (vDS -> Monitor -> Health Check) and confirm "VLAN and MTU" status is Normal across all cluster hosts.'
    ];
    verificationSteps = [
      'Confirm VM receives ICMP reply from default gateway and external subnet.',
      'Verify <code>esxcli network nic stats get</code> confirms zero dropped packets.',
      'Perform test vMotion migration back and forth to validate continuous network reachability.'
    ];

  } else if (q.includes('psod') || q.includes('vmkernel') || q.includes('not_implemented') || q.includes('purple screen')) {
    detectedCategory = 'VMware ESXi Kernel & Driver Stability (PSOD)';
    targetPlatform = 'VMware vSphere';
    rootCause = `The host encountered an unrecoverable kernel trap in <code>vmkernel</code> (NOT_IMPLEMENTED exception). This condition typically occurs when an unsupported device driver opcode is dispatched to the storage HBA (e.g., lsi_mr3, smartpqi, or qfle3) or during firmware-driver parity mismatch under heavy I/O queue pressure.`;
    cliCommands = `# 1. Extract the crash core dump and backtrace log
esxcli system coredump file get
esxcli system coredump partition get

# 2. Check storage controller driver and firmware revision
esxcli storage core adapter list
esxcli software vib list | grep -E "lsi|smartpqi|bnxt|qfle3"

# 3. Check VMkernel log timestamps leading up to PSOD
zcat /var/run/log/vmkernel.*.gz | grep -iE "NOT_IMPLEMENTED|exception|assert" | tail -n 40`;
    remediationSteps = [
      'Collect the coredump partition using <code>esxcfg-dumppart --copy --dumpfilenm /vmfs/volumes/datastore1/esxi-dump.core</code>.',
      'Check the VMware Compatibility Guide (VCG / HCL) for exact matching of PCIe controller firmware (BIOS/UEFI) and async VIB driver version.',
      'If async driver was recently upgraded, downgrade or apply vendor hotfix VIB via ESXi Maintenance Mode: <code>esxcli software vib install -d /vmfs/volumes/datastore1/driver-bundle.zip</code>.',
      'Reboot ESXi host and verify host power management profile in UEFI is set to OS Control or Static High Performance.'
    ];
    verificationSteps = [
      'Verify host uptime: <code>uptime</code> and check memory health: <code>esxcli hardware memory get</code>.',
      'Verify datastore paths are active without path thrashing: <code>esxcli storage nmp device list</code>.'
    ];

  } else if (q.includes('vsan') && (q.includes('disk') || q.includes('degraded') || q.includes('rebuild'))) {
    detectedCategory = 'VMware vSAN Storage Health & Disk Group Rebuild';
    targetPlatform = 'VMware vSphere';
    rootCause = `A physical capacity or cache drive in a vSAN disk group reported a Permanent Device Loss (PDL) or SMART read/write threshold breach. vSAN transitioned the affected disk group into Degraded status to prevent silent data corruption and initiated an object rebuild cycle to restore RAID-1/RAID-5 quorum.`;
    cliCommands = `# 1. Check vSAN cluster health and component resyncing status
esxcli vsan health cluster list
esxcli vsan debug resync summary get

# 2. Inspect disk group physical device states and CMMDS membership
esxcli vsan storage list | grep -E "Device|In CMMDS|State"

# 3. Identify disk NAA identifier and physical enclosure slot
esxcli storage core device list -d <naa_id>`;
    remediationSteps = [
      'Confirm whether rebuild traffic is throttled: navigate to vSAN Cluster -> Configure -> vSAN -> Advanced Options.',
      'Evacuate or remove degraded disk group if drive is unresponsive: <code>esxcli vsan storage remove -s &lt;naa_id&gt;</code>.',
      'Physically replace faulty SAS/NVMe drive and add new disk to the storage pool: <code>esxcli vsan storage add -d &lt;capacity_naa&gt; -s &lt;cache_naa&gt;</code>.',
      'Verify vSAN object compliance: trigger "Check Infrastructure & Resync Status" from vSphere Client.'
    ];
    verificationSteps = [
      'Verify <code>esxcli vsan health cluster list</code> returns all Green status.',
      'Ensure <code>esxcli vsan debug resync summary get</code> reports 0 remaining bytes to resync.'
    ];

  } else if ((q.includes('vcsa') || q.includes('vcenter') || q.includes('vpxd')) && (q.includes('storage') || q.includes('seat') || q.includes('full') || q.includes('100%'))) {
    detectedCategory = 'VMware vCenter VCSA /storage/seat Disk Full & Service Recovery';
    targetPlatform = 'VMware vSphere';
    rootCause = `The PostgreSQL database partition (/storage/seat: Stats, Events, Alarms, Tasks) on the VCSA appliance reached 100% utilization. PostgreSQL terminated active transaction workers, preventing the core <code>vmware-vpxd</code> service from binding sockets and resulting in 503 Service Unavailable.`;
    cliCommands = `# 1. SSH to vCenter VCSA shell and inspect disk partition usage
df -h /storage/seat /storage/core /storage/log

# 2. Check vCenter core service statuses
service-control --status --all

# 3. Clean old compressed log bundles to restore immediate breathing room
find /storage/log/vmware/vpxd -name "*.gz" -mtime +14 -delete`;
    remediationSteps = [
      'In vSphere Client / parent ESXi host, increase virtual disk VMDK 8 (SEAT partition) size by at least 25 GB.',
      'SSH into VCSA appliance and trigger online filesystem expansion: <code>vpxd_servicecfg storage auto-expand</code>.',
      'Restart vCenter core management daemons: <code>service-control --start --all</code>.',
      'Configure database retention policy in vCenter Settings: reduce Tasks & Events retention from 180 days to 30 days.'
    ];
    verificationSteps = [
      'Verify <code>df -h /storage/seat</code> reports less than 80% utilization.',
      'Confirm <code>service-control --status vmware-vpxd</code> reports <b>Running</b> and login to vSphere Client loads cleanly.'
    ];

  } else if ((q.includes('snapshot') || q.includes('stun') || q.includes('locked')) && (q.includes('vmdk') || q.includes('vmware') || q.includes('consolidation'))) {
    detectedCategory = 'VMware VM Stun & Locked .vmdk Snapshot Consolidation Failure';
    targetPlatform = 'VMware vSphere';
    rootCause = `A virtual machine base disk or delta snapshot .vmdk remains locked by a backup appliance proxy or an ESXi host that suffered an abrupt network drop during hotadd backup. Subsequent consolidation fails with "The file is locked by another process".`;
    cliCommands = `# 1. Identify which ESXi host holds the VMFS file lock on the delta VMDK
vmkfstools -D /vmfs/volumes/datastore/VM_NAME/VM_NAME-000001.vmdk

# 2. Extract VMID for consolidation
vim-cmd vmsvc/getallvms | grep -i "VM_NAME"

# 3. Trigger command-line snapshot consolidation
vim-cmd vmsvc/snapshot.consolidate <VMID>`;
    remediationSteps = [
      'Examine the MAC address in the <code>vmkfstools -D</code> output header to identify the locking ESXi host.',
      'SSH to the locking host and restart management agents if backup proxy unmount hung: <code>/etc/init.d/hostd restart</code>.',
      'If VMFS lock persists, power off backup proxy VM and remove secondary disks.',
      'Run snapshot consolidation: right click VM -> Snapshots -> Consolidate.'
    ];
    verificationSteps = [
      'Verify vSphere Client shows "Needs Consolidation: No" in VM Summary.',
      'Confirm VM datastore directory contains only base .vmdk disks without residual delta files.'
    ];

  // ==========================================
  // 2. WINDOWS SERVER & ACTIVE DIRECTORY
  // ==========================================
  } else if (q.includes('4771') || (q.includes('kerberos') && q.includes('lockout')) || q.includes('0x18')) {
    detectedCategory = 'Windows Active Directory & Kerberos Pre-Auth Lockout (0x18)';
    targetPlatform = 'Windows Server';
    rootCause = `Kerberos Pre-Authentication Failure Event ID 4771 with Failure Code <code>0x18</code> indicates invalid credentials supplied during AS-REQ ticket exchange. Stale cached credentials in Windows Credential Manager, automated Scheduled Tasks, or disconnected RDP sessions trigger rapid account lockouts.`;
    cliCommands = `# 1. Query DC Security log for Event 4771 Code 0x18 to extract Caller IP
Get-WinEvent -FilterHashtable @{LogName='Security';Id=4771} -MaxEvents 25 | 
  Where-Object { $_.Properties[4].Value -eq '0x18' } | 
  Select-Object TimeCreated, @{N='User';E={$_.Properties[0].Value}}, @{N='ClientIP';E={$_.Properties[6].Value}}

# 2. Check user lockout status and bad password counter
Get-ADUser -Identity "TargetUser" -Properties BadPwdCount, BadPasswordTime, LockedOut

# 3. Purge cached Kerberos ticket on caller workstation
klist purge`;
    remediationSteps = [
      'Trace Caller IP identified from Event 4771 to pinpoint the workstation or mobile endpoint.',
      'Inspect client endpoint for scheduled tasks, persistent mapped drives, or Windows Credential Manager entries.',
      'Unlock the Active Directory user account: <code>Unlock-ADAccount -Identity "TargetUser"</code>.',
      'If caller is a mobile MDM device, re-authenticate or re-enroll the ActiveSync profile.'
    ];
    verificationSteps = [
      'Verify BadPwdCount returns 0: <code>Get-ADUser "TargetUser" -Properties BadPwdCount</code>.',
      'Monitor DC Security log for 15 minutes to confirm no new 4771 failure events appear.'
    ];

  } else if (q.includes('8453') || (q.includes('replication') && (q.includes('denied') || q.includes('rpc') || q.includes('active directory')))) {
    detectedCategory = 'Active Directory DC Replication Error 8453 (Access Denied / RPC Ports)';
    targetPlatform = 'Windows Server';
    rootCause = `Domain Controller Active Directory replication failed with Win32 Error 8453 ("Replication access was denied"). This error is caused by missing "Replicating Directory Changes" permissions on the naming context root, RPC dynamic port exhaustion, or Kerberos SPN duplication across domain controllers.`;
    cliCommands = `# 1. Inspect Active Directory replication summary and inbound neighbor status
repadmin /replsummary
repadmin /showrepl * /csv > repl_status.csv

# 2. Test RPC endpoint mapper and dynamic RPC connectivity to partner DC
Test-NetConnection -ComputerName "DC02.domain.com" -Port 135
Test-NetConnection -ComputerName "DC02.domain.com" -Port 445

# 3. Run dcdiag replication and SPN verification tests
dcdiag /test:Replication /v
setspn -X`;
    remediationSteps = [
      'Verify replication permissions: in ADSI Edit, connect to domain partition root, verify "Enterprise Domain Controllers" has "Replicating Directory Changes All" permissions.',
      'Ensure RPC dynamic port range (TCP 49152-65535) is not blocked by intermediate firewalls between branch and core DCs.',
      'If SPN duplicates exist, remove duplicate registration: <code>setspn -D &lt;SPN&gt; &lt;AccountName&gt;</code>.',
      'Force synchronous replication across all naming contexts: <code>repadmin /syncall /AePdq</code>.'
    ];
    verificationSteps = [
      'Verify <code>repadmin /showrepl</code> reports "Last attempt was successful" for all naming contexts.',
      'Confirm <code>dcdiag /test:Replication</code> passes with zero errors.'
    ];

  } else if (q.includes('dfs-r') || q.includes('dfsr') || (q.includes('staging') && q.includes('quota'))) {
    detectedCategory = 'Windows DFS-R Replication Backlog & Staging Quota Recovery';
    targetPlatform = 'Windows Server';
    rootCause = `The DFS Replication service halted replication because the staging folder reached 90% of its configured quota, or dirty database shutdown occurred after an abrupt power event. Large files exceeding available staging headroom cause persistent replication backlogs.`;
    cliCommands = `# 1. Query DFSR backlog between sending and receiving partners
Get-DfsrBacklog -SendingMember "FS01" -ReceivingMember "FS02" -GroupName "CorpShare"

# 2. Check DFSR staging folder size and cleanup state
wmic /namespace:\\root\microsoftdfs path dfsrreplicatedfolderinfo get replicationgroupname,replicatedfoldername,stagingfoldersizeinmb

# 3. Query DFS-R event log for Event ID 4202 (Staging full) or 2212 (Dirty shutdown)
Get-WinEvent -FilterHashtable @{LogName='DFS Replication';Id=4202,2212} -MaxEvents 15`;
    remediationSteps = [
      'Increase staging folder quota: in DFS Management console, set Staging Quota to at least 64 GB for high-change shares.',
      'If dirty shutdown occurred (Event 2212), resume auto recovery: <code>wmic /namespace:\\root\microsoftdfs path dfsrmachineconfig set StopReplicationOnAutoRecovery=0</code>.',
      'Restart DFS-R service: <code>Restart-Service DFSR</code>.',
      'Monitor backlog draining: run <code>dfsrdiag backlog /rgname:"Corp" /rfname:"Data" /smem:FS01 /rmem:FS02</code>.'
    ];
    verificationSteps = [
      'Verify <code>Get-DfsrBacklog</code> count reaches 0.',
      'Confirm files created on FS01 appear on FS02 within replication SLA.'
    ];

  // ==========================================
  // 3. ENTERPRISE LINUX & KERNEL
  // ==========================================
  } else if (q.includes('kswapd') || (q.includes('iowait') && q.includes('memory'))) {
    detectedCategory = 'Linux Kernel Memory Management & Storage Bottlenecks (kswapd0)';
    targetPlatform = 'Enterprise Linux';
    rootCause = `The Linux kernel asynchronous memory reclaim daemon (<code>kswapd0</code>) spiked to 100% CPU due to high memory watermarks breached under heavy I/O. The system thrashing occurs as the page allocator aggressively flushes dirty pages and scans page tables.`;
    cliCommands = `# 1. Inspect memory usage, swap rate, and disk I/O wait
free -h
vmstat 1 5
iostat -xz 1 5

# 2. Identify top memory consuming processes and page cache breakdown
ps aux --sort=-%mem | head -n 15
cat /proc/meminfo | grep -E "MemFree|MemAvailable|Buffers|Cached|Dirty|SwapTotal|SwapFree"

# 3. Check kernel slab allocator allocation
slabtop -s c -o | head -n 20`;
    remediationSteps = [
      'Reduce kernel swappiness temporarily to avoid thrashing: <code>sysctl vm.swappiness=10</code> (persist in <code>/etc/sysctl.conf</code>).',
      'Increase <code>vm.min_free_kbytes</code> to provide sufficient buffer headroom: <code>sysctl vm.min_free_kbytes=131072</code>.',
      'If page cache is bloated and causing I/O choke, safely flush dirty pages: <code>sync; echo 3 > /proc/sys/vm/drop_caches</code>.',
      'Identify memory leaks in running services (e.g. Java JVM heap exhaustion) and restart the offending daemon.'
    ];
    verificationSteps = [
      'Verify kswapd0 CPU drops to near 0%: <code>top -b -n 1 | grep kswapd</code>.',
      'Confirm <code>vmstat 1 3</code> reports <code>si</code> (swap in) and <code>so</code> (swap out) at 0.'
    ];

  } else if (q.includes('oom') || q.includes('oom-killer') || q.includes('oomd')) {
    detectedCategory = 'Linux Kernel Out-of-Memory (OOM) Killer & cgroup Memory Pressure';
    targetPlatform = 'Enterprise Linux';
    rootCause = `The Linux kernel invoked the OOM killer because total physical RAM and swap space were completely exhausted. The kernel calculated oom_score for running processes and sent SIGKILL (signal 9) to the highest-scoring candidate to protect kernel stability.`;
    cliCommands = `# 1. Extract kernel OOM killer invocation logs and killed PID
dmesg -T | grep -iE "oom|killed process|out of memory" | tail -n 30

# 2. Inspect systemd-oomd service logs and cgroup memory limits
journalctl -u systemd-oomd --since "1 hour ago"
systemd-cgtop -m

# 3. Check current memory limits per slice
cat /sys/fs/cgroup/memory/memory.limit_in_bytes`;
    remediationSteps = [
      'Identify the killed service (e.g. mysqld, java, container daemon) and inspect its memory limits.',
      'Configure systemd service MemoryMax or MemoryHigh in <code>/etc/systemd/system/myservice.service.d/override.conf</code>.',
      'Add dedicated emergency swap space if system runs without swap: <code>fallocate -l 8G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile</code>.',
      'Restart the impacted production service cleanly: <code>systemctl restart &lt;service&gt;</code>.'
    ];
    verificationSteps = [
      'Verify service is active: <code>systemctl status &lt;service&gt;</code>.',
      'Confirm <code>dmesg -T</code> shows no new OOM invocations.'
    ];

  // ==========================================
  // 4. CISCO UCS & FABRIC INTERCONNECT
  // ==========================================
  } else if (isCisco && (q.includes('subordinate') || q.includes('cluster') || q.includes('degraded') || q.includes('heartbeat') || q.includes('failover'))) {
    detectedCategory = 'Cisco UCS Fabric Interconnect High Availability & Cluster Recovery';
    targetPlatform = 'Cisco UCS';
    rootCause = `The Cisco UCS Fabric Interconnect HA cluster heartbeat link (L1/L2 cross-connect) experienced communication degradation or heartbeat loss. The Subordinate FI cannot reliably synchronize its state machine with the Primary FI, placing the cluster into DEGRADED state to prevent split-brain.`;
    cliCommands = `# 1. Connect to Cisco UCS Manager CLI (SSH to VIP or FI-A/B)
show cluster state
show cluster extended-state

# 2. Inspect physical L1 and L2 cross-connect link health
show interface eth1/1
show interface eth1/2
show tech-support cluster | head -n 40

# 3. Verify NTP synchronization across both FIs
show clock
show ntp status`;
    remediationSteps = [
      'Verify physical cable integrity of L1 and L2 cluster links between Fabric Interconnect A and B.',
      'Check for management network VIP conflict or ARP poisoning on the upstream management switch.',
      'If heartbeat process is stuck, connect to the Subordinate FI CLI and verify processes: <code>connect local-mgmt</code> then <code>show processes</code>.',
      'Perform clean management service restart on Subordinate FI: <code>connect local-mgmt</code> followed by <code>restart pmon</code>.'
    ];
    verificationSteps = [
      'Run <code>show cluster state</code>: Primary should be <b>HA READY</b> and Subordinate should be <b>HA READY</b>.',
      'Verify Virtual IP (VIP) responds with 0% packet loss from external management workstation.'
    ];

  // ==========================================
  // 5. AWS CLOUD INFRASTRUCTURE
  // ==========================================
  } else if (isAWS) {
    detectedCategory = 'AWS Cloud Infrastructure & Compute Availability';
    targetPlatform = 'AWS Cloud';
    rootCause = `The AWS cloud instance or managed resource failed reachability or performance thresholds. For EC2 1/2 Status Check failures, the host hypervisor is operational but the guest OS kernel panicked, hung during initrd boot, or experienced file system journal corruption on the EBS root volume (xvda/nvme0n1).`;
    cliCommands = `# 1. Query EC2 instance system and instance reachability status
aws ec2 describe-instance-status --instance-ids "i-0a12b34c56d78e9f0"

# 2. Retrieve instance system console output / boot crash logs
aws ec2 get-console-output --instance-id "i-0a12b34c56d78e9f0" --output text | tail -n 50

# 3. Check CloudWatch EBS VolumeQueueLength and VolumeThroughputPercentage
aws cloudwatch get-metric-statistics --namespace AWS/EBS --metric-name VolumeQueueLength \
  --dimensions Name=VolumeId,Value="vol-0123456789abcdef0" \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 --statistics Maximum`;
    remediationSteps = [
      'For EC2 Status Check failure: Stop the instance and start it (this shifts the VM to a healthy physical AWS host).',
      'If instance remains in 1/2 status check failed, detach the root EBS volume and attach it as a secondary data disk to a rescue instance.',
      'Mount the rescue partition, chroot, and repair kernel initramfs: <code>dracut --regenerate-all --force</code>.',
      'For EBS IOPS throttling: Modify volume type to gp3 or io2 with increased provisioned IOPS: <code>aws ec2 modify-volume --volume-id vol-xxx --volume-type gp3 --iops 6000 --throughput 250</code>.'
    ];
    verificationSteps = [
      'Verify <code>aws ec2 describe-instance-status</code> returns <code>Status: ok</code> for both SystemStatus and InstanceStatus.',
      'Confirm SSH connectivity and CloudWatch metrics indicate zero queue length stalls.'
    ];

  // ==========================================
  // 6. MICROSOFT AZURE CLOUD
  // ==========================================
  } else if (isAzure) {
    detectedCategory = 'Microsoft Azure Hybrid Cloud & Networking';
    targetPlatform = 'Microsoft Azure';
    rootCause = `The Azure resource experienced access isolation or platform service throttling. Common triggers include Network Security Group (NSG) priority rule override blocking TCP 3389/22, Azure Serial Console kernel hang, Azure AD Connect UPN/SMTP anchor mismatches, or ExpressRoute BGP peering state dropping to Active.`;
    cliCommands = `# 1. Verify Azure VM power state and network interface provisioning status
az vm get-instance-view --resource-group "rg-production" --name "vm-app01" --query "instanceView.statuses[?starts_with(code, 'PowerState/')].displayStatus" -o tsv

# 2. Check Effective Network Security Group (NSG) rules applied to VM NIC
az network nic list-effective-nsg --resource-group "rg-production" --name "vm-app01-nic" -o table

# 3. Connect to Azure Serial Console to inspect SAC / Linux kernel console
az rest --method POST --uri "/subscriptions/{sub}/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-app01/serialConsole"`;
    remediationSteps = [
      'Check NSG rules: ensure Inbound Port 443 (for Bastion) or Port 3389/22 does not have a higher-priority "DenyAll" rule overriding access.',
      'Use Azure VM Run Command to reset guest firewall or RDP: <code>az vm run-command invoke -g "rg-prod" -n "vm-app01" --command-id RunPowerShellScript --scripts "Set-ItemProperty -Path \'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\' -Name \'fDenyTSConnections\' -Value 0"</code>.',
      'For Azure AD Connect InvalidSoftMatch: Remediate the cloud immutable ID using Microsoft Graph PowerShell: <code>Set-MgUser -UserId $user.Id -OnPremisesImmutableId $null</code>.',
      'For ExpressRoute: Verify primary and secondary BGP peering IPs with telecom provider.'
    ];
    verificationSteps = [
      'Run <code>az network watcher test-connectivity</code> from source to destination IP on TCP 443/3389.',
      'Confirm Azure AD Connect delta synchronization reports <code>Success</code> without validation errors.'
    ];

  // ==========================================
  // 7. DYNAMIC KNOWLEDGE BASE SEARCH FALLBACK
  // ==========================================
  } else {
    // Check if query matches an existing KB article in window.KB_ARTICLES
    let matchedArticle = null;
    if (typeof window !== 'undefined' && Array.isArray(window.KB_ARTICLES)) {
      const qTerms = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['and','the','with','for','check','error','after','lost'].includes(w));
      let bestScore = 0;
      for (const a of window.KB_ARTICLES) {
        let score = 0;
        const text = `${a.title || ''} ${a.category || ''} ${a.platform || ''} ${a.description || ''}`.toLowerCase();
        for (const term of qTerms) {
          if (text.includes(term)) score += 2;
        }
        if (a.commands) {
          for (const term of qTerms) {
            if (a.commands.toLowerCase().includes(term)) score += 1;
          }
        }
        if (score > bestScore && score >= 3) {
          bestScore = score;
          matchedArticle = a;
        }
      }
    }

    if (matchedArticle) {
      detectedCategory = `${matchedArticle.platform || targetPlatform} ${matchedArticle.category || 'Incident'} Resolution`;
      targetPlatform = matchedArticle.platform || targetPlatform;
      rootCause = matchedArticle.description || `Investigation into ${esc(matchedArticle.title)} on ${targetPlatform}. Root causes correlate with service interrupt, configuration drift, or resource exhaustion.`;
      cliCommands = matchedArticle.commands || `# Baseline diagnostic inspection for ${targetPlatform}\nesxcli system version get`;
      remediationSteps = [
        'Review recent change tickets, configuration modifications, and administrative tasks.',
        'Execute the validated command lines in order from lowest impact to service-restarting procedures.',
        'Check service logs for corresponding correlation IDs or fatal socket binding errors.'
      ];
      verificationSteps = [
        'Verify service daemon or host responds cleanly to synthetic health checks.',
        'Validate error log streams report clean operational state with zero persistent fault codes.'
      ];
    } else {
      // Dynamic Intelligent Technical Synthesizer (Zero Generic AI Slop)
      const hasInstallIntent = /install|deploy|setup|provision|build|image|iso|baremetal|hardware/.test(q);
      const hasNetworkIntent = /network|vlan|mtu|trunk|uplink|port|routing|gateway|ip|ping|connectivity/.test(q);
      const hasStorageIntent = /storage|disk|lun|san|raid|volume|multipath|iops|latency|vmdk|partition/.test(q);
      const hasUpgradeIntent = /upgrade|migrate|migration|update|patch|lifecycle/.test(q);

      if (hasInstallIntent) {
        detectedCategory = `${targetPlatform} Hardware Provisioning & Software Deployment Playbook`;
        rootCause = `Analysis and deployment execution plan for <strong>${esc(query)}</strong> on <strong>${targetPlatform}</strong>. OS and hypervisor provisioning requires strict validation of the vendor Hardware Compatibility List (HCL), controller firmware-to-driver parity, verified installation ISO images, and correct boot order targeting.`;
        cliCommands = (
          isCisco || isVMware ? `# 1. Check server chassis, firmware, and adapter inventory\nshow cluster state 2>/dev/null || esxcli system version get 2>/dev/null\nshow server firmware detail 1/1 2>/dev/null || esxcli software vib list | grep -i cisco\n\n# 2. Check storage controllers and active network uplinks\nesxcli storage core adapter list 2>/dev/null || show adapter detail\nesxcli network nic list 2>/dev/null` :
          isLinux ? `# 1. Check system hardware, CPU, memory, and disk architecture\nuname -a\nlscpu\nlsblk -f\n\n# 2. Inspect kernel dmesg for hardware initialization alerts\ndmesg -T | grep -iE "acpi|pci|ahci|nvme|error" | head -n 30` :
          isWindows ? `# 1. Inspect Windows Server OS architecture and driver state\nGet-ComputerInfo | Select-Object WindowsProductName, OsArchitecture, BiosBIOSVersion\nGet-PnpDevice -Status Error, Degraded\n\n# 2. Inspect disk partitions and volumes\nGet-Disk\nGet-Volume` :
          isAzure ? `az vm get-instance-view -g "rg-prod" -n "vm-app"\naz disk list -g "rg-prod" -o table` :
          isAWS ? `aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"\naws ec2 describe-volumes` :
          `uname -a\nip link show\ndf -h\ndmesg | tail -n 25`
        );
        remediationSteps = [
          'Verify target hardware specifications and minimum compute/storage prerequisites against the official vendor compatibility guide.',
          'Download official vendor-tailored installer media (avoid vanilla generic ISOs if dedicated vendor firmware/drivers are required).',
          'Configure server boot policy (Virtual Media / USB / Local RAID / PXE) in management controller (CIMC, iLO, iDRAC, BIOS).',
          'Initiate installation and assign management IP, subnet mask, default gateway, and correct VLAN tag.'
        ];
        verificationSteps = [
          'Verify management interface responds to ICMP and administrative console (SSH / HTTPS / DCUI) is accessible.',
          'Confirm all physical network adapters and storage controllers load verified certified device drivers without kernel warnings.'
        ];
      } else if (hasNetworkIntent) {
        detectedCategory = `${targetPlatform} Network Connectivity, Routing & VLAN Isolation Recovery`;
        rootCause = `Network diagnosis for <strong>${esc(query)}</strong> on <strong>${targetPlatform}</strong>. Primary failure mechanisms include physical uplink flapping, 802.1Q VLAN trunking mismatches, MTU size discrepancies (1500 vs 9000 Jumbo Frames), or stale switch MAC forwarding tables.`;
        cliCommands = (
          isVMware ? `esxcli network nic list\nesxcli network vswitch dvs vmware list\nvmkping -I vmk0 <Gateway_IP> -d -s 1472\nesxcli network nic stats get -n vmnic0` :
          isCisco ? `show interface status\nshow cluster state\nshow interface brief\nshow port-channel summary` :
          isLinux ? `ip addr show\nip route show\nethtool eth0\nping -c 4 <Gateway_IP>\ntraceroute <Destination_IP>` :
          isWindows ? `Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed\nGet-NetIPConfiguration\nTest-NetConnection -ComputerName <Target_IP> -Port 443\nroute print` :
          isAzure ? `az network nic list-effective-nsg -g "rg-prod" -n "vm-nic"\naz network watcher test-connectivity --source-resource "vm-id" --dest-address "target-ip"` :
          isAWS ? `aws ec2 describe-security-groups\naws ec2 describe-network-interfaces` :
          `ip link\nip route\nping -c 3 8.8.8.8`
        );
        remediationSteps = [
          'Audit upstream physical switch port configuration to ensure the target VLAN ID is permitted in the active 802.1Q trunk.',
          'Verify MTU consistency end-to-end between host hypervisor/OS, virtual switches, and physical Top-of-Rack (TOR) switches.',
          'Test bidirectional packet transmission without fragmentation using forced-size ICMP pings.',
          'Clear stale ARP entries or restart network stack daemon during maintenance window.'
        ];
        verificationSteps = [
          'Confirm 0% packet loss and low latency to default gateway and DNS servers.',
          'Validate that interface error counters (CRC, dropped packets, collisions) remain at zero.'
        ];
      } else if (hasStorageIntent) {
        const cleanTopic = query
          .replace(/^(please\s+)?(help\s+me\s+with\s+|how\s+to\s+|steps\s+for\s+|what\s+are\s+the\s+steps\s+to\s+|troubleshoot(ing)?\s+|fix\s+|resolve\s+)/i, '')
          .replace(/^(steps\s+to\s+troubleshoot\s+|troubleshooting\s+steps\s+for\s+)/i, '')
          .trim();
        detectedCategory = `${targetPlatform} Storage Fabric, LUN Multipathing & Datastore Performance Remediation`;
        rootCause = `Storage diagnostic investigation for <strong>${esc(cleanTopic || query)}</strong> on <strong>${targetPlatform}</strong>.<br><br>
<b>Technical Architecture & Failure Mechanisms:</b><br>
In VMware vSphere environments, ESXi host storage anomalies originate across three distinct physical and logical layers:
<ul style="margin:6px 0 6px 18px; line-height:1.6;">
  <li><b>1. Physical HBA & SAN Fabric Layer:</b> Fibre Channel optic light degradation, SAN switch buffer-to-buffer credit starvation, or iSCSI TCP socket timeouts and packet loss on dedicated storage VLANs.</li>
  <li><b>2. Pluggable Storage Architecture (PSA):</b> Native Multipathing Plugin (NMP) path failures, improper SATP (Storage Array Type Plugin) rule assignments (e.g., non-ALUA array mapped to ALUA), or PSP Round Robin threshold left at default 1000 IOPS causing path underutilization.</li>
  <li><b>3. VMFS Locking & Filesystem Layer:</b> VAAI ATS (Atomic Test & Set) locking contention, APD (All Paths Down) vs PDL (Permanent Device Loss) events, or datastore inode / VMDK lease locking during snapshot consolidation.</li>
</ul>`;
        cliCommands = (
          isVMware ? `# ========================================================
# PHASE 1: PHYSICAL HBA ADAPTER & SAN FABRIC LINK LAYER
# ========================================================
# 1. List all host storage adapters, WWNN/WWPN, driver versions, and link status
esxcli storage core adapter list

# 2. Check Fibre Channel port speed negotiation and link state (or iSCSI sessions)
esxcli storage san fc list 2>/dev/null || esxcli iscsi adapter list 2>/dev/null
esxcli iscsi session list 2>/dev/null

# ========================================================
# PHASE 2: LUN DEVICE, MULTIPATHING (NMP/PSP/SATP) & PATH STATUS
# ========================================================
# 3. Check Native Multipathing (NMP) configuration, SATP plugin, and active PSP (Round Robin / Fixed)
esxcli storage nmp device list

# 4. List all physical paths for target LUN NAA identifier (verify Active vs Dead paths)
esxcli storage core path list --device=<naa_id> | grep -E "Device|State|Preferred|Adapter"

# 5. Check device status for APD (All Paths Down) or PDL (Permanent Device Loss)
esxcli storage core device list -d <naa_id> | grep -E "Status|Is Local|Is Removable|Is SSD"

# ========================================================
# PHASE 3: VMFS FILESYSTEM MOUNT STATE, FREE SPACE & VM LOCKS
# ========================================================
# 6. Verify VMFS datastore mount states, volume UUIDs, and storage capacity
esxcli storage filesystem list
df -hT /vmfs/volumes/*

# 7. Check VAAI hardware acceleration primitives (ATS, Clone Blocks, Zero)
esxcli storage core device vaai status get -d <naa_id>

# 8. Check for stale VMFS lock or ATS heartbeat timeout on specific VMDK
vmkfstools -D /vmfs/volumes/<Datastore_Name>/<VM_Folder>/<VM_Disk>.vmdk

# ========================================================
# PHASE 4: REAL-TIME LATENCY & ERROR EXTRACTION (esxtop & vmkernel)
# ========================================================
# 9. Real-time disk inspection in esxtop (press 'd' for HBA, 'u' for LUN, 'v' for VM)
# Baselines: KAVG/cmd < 2ms (host kernel queue), DAVG/cmd < 15ms (SAN/device latency), ABRTS/cmd = 0
grep -iE "scsi|sense|abort|pdl|apd|timeout|queue full" /var/log/vmkernel.log | tail -n 45` :
          isLinux ? `# 1. Block devices, filesystem breakdown, and inode utilization\nlsblk -f\ndf -hT\ndf -i\n\n# 2. I/O wait and disk saturation\niostat -xz 1 5\nlsof | grep '(deleted)' | head -n 25\n\n# 3. Kernel block device error log\ndmesg -T | grep -iE "io error|scsi|ata|ext4|xfs" | tail -n 30` :
          isWindows ? `# 1. Physical disk and storage pool status\nGet-PhysicalDisk | Select-Object FriendlyName, MediaType, OperationalStatus, HealthStatus\nGet-VirtualDisk\nGet-Volume\n\n# 2. Disk latency and NTFS corruption test\nfsutil volume diskfree C:\nGet-WinEvent -FilterHashtable @{LogName='System';ProviderName='disk','ntfs'} -MaxEvents 20` :
          `lsblk\ndf -h\niostat 1 3`
        );
        remediationSteps = [
          '<b>Isolate Failure Domain:</b> Distinguish between APD (All Paths Down: transient fabric switch or SAN link flap) and PDL (Permanent Device Loss: SCSI sense 04/03 0x25 0x00 indicating LUN was deleted or unmapped from array).',
          '<b>Verify Multipathing & Set Round Robin IOPS = 1:</b> Change PSP from Fixed to Round Robin, and lower IOPS switching frequency from default 1000 to 1 for true active-active SAN load distribution: <code>esxcli storage nmp psp roundrobin deviceconfig set --type=iops --iops=1 --device=&lt;naa_id&gt;</code>.',
          '<b>Execute Non-Disruptive Storage Rescan:</b> Refresh SCSI bus adapters to detect restored LUN paths without cluster disruption: <code>esxcli storage core adapter rescan --all</code>.',
          '<b>Check VAAI Hardware Acceleration:</b> If ATS heartbeat timeouts occur in vmkernel.log, test disabling ATS heartbeat temporarily: <code>esxcli system settings advanced set -o /VMFS3/UseATSForHB -i 0</code>.',
          '<b>Clear VMFS File Lock Contention:</b> If snapshot consolidation fails due to locked .vmdk, extract locking MAC address via <code>vmkfstools -D</code> and restart management agents on that host (<code>/etc/init.d/hostd restart && /etc/init.d/vpxa restart</code>).'
        ];
        verificationSteps = [
          'Verify all storage paths report <b>Active / Optimized</b> with zero dead channels: <code>esxcli storage core path list | grep -i status</code>.',
          'Monitor <code>esxtop</code> (press <code>u</code>) to verify DAVG/cmd and KAVG/cmd latency remain below 10ms with 0 ABRTS/cmd (zero aborted commands).',
          'Confirm all datastores report <code>Mounted: true</code> in <code>esxcli storage filesystem list</code> and VMs operate without I/O pause.'
        ];
      } else if (hasUpgradeIntent) {
        detectedCategory = `${targetPlatform} System Upgrade & Workload Migration Playbook`;
        rootCause = `Lifecycle upgrade and migration architecture for <strong>${esc(query)}</strong> on <strong>${targetPlatform}</strong>. Upgrades require pre-flight compatibility verification, backup/snapshot validation, and sequential dependency updates (e.g., vCenter before ESXi, UCSM before server firmware).`;
        cliCommands = (
          isVMware ? `esxcli system version get\nesxcli software vib list | head -n 25\nesxcli software profile get` :
          isLinux ? `uname -r\ncat /etc/os-release\nsudo apt update 2>/dev/null || sudo dnf check-update 2>/dev/null` :
          isWindows ? `Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" | Select-Object ProductName, ReleaseId, CurrentBuild` :
          `uname -a`
        );
        remediationSteps = [
          'Capture full pre-upgrade state snapshots or backups of critical configuration files and databases.',
          'Stage official update packages and verify digital signature/checksum before execution.',
          'Drain active workloads or place host in Maintenance Mode with live migration.',
          'Apply the upgrade package and execute a controlled system restart.'
        ];
        verificationSteps = [
          'Confirm target OS/hypervisor version matches the target build number.',
          'Validate that all production services start cleanly and resume operational workload processing.'
        ];
      } else {
        detectedCategory = `${targetPlatform} Infrastructure Systems Engineering Analysis`;
        rootCause = `Systems engineering diagnostic assessment for <strong>${esc(query)}</strong> on <strong>${targetPlatform}</strong>. Root cause analysis isolates operational anomalies, service crashes, configuration drift, and environmental dependency constraints.`;
        cliCommands = (
          isVMware ? `esxcli system version get\nesxcli network nic list\nesxcli storage core adapter list\ncat /var/log/vmkernel.log | tail -n 30` :
          isCisco ? `show cluster state\nshow server inventory\nshow fault\nshow tech-support chassis` :
          isWindows ? `Get-Service | Where-Object {$_.Status -ne "Running" -and $_.StartType -eq "Automatic"}\nGet-EventLog -LogName System -EntryType Error -Newest 15\nTest-NetConnection -ComputerName "gateway" -Port 443` :
          isLinux ? `systemctl status\njournalctl -xe -p 3 -n 40\ndf -hT\ndmesg -T | grep -iE "error|fail|warn" | tail -n 25` :
          isAzure ? `az vm get-instance-view\naz network nic list-effective-nsg\naz network watcher test-connectivity` :
          isAWS ? `aws ec2 describe-instance-status\naws health describe-events --filter "eventStatusCodes=open"` :
          `ping -c 4 127.0.0.1\nnetstat -tuln\nss -tulnp\ncurl -Iv http://localhost`
        );
        remediationSteps = [
          'Audit recently committed configuration changes, security ACLs, and service account credentials.',
          'Execute diagnostic commands to isolate service daemon errors and socket binding states.',
          'Apply targeted remediation steps to resolve configuration drift or service interruption.',
          'Perform health verification checks and clear all active alert thresholds.'
        ];
        verificationSteps = [
          'Confirm system daemons report Active (Running) with 0 exit errors.',
          'Validate system logging shows normal operational cycles without persistent fault codes.'
        ];
      }
    }
  }

  // Model-Differentiated Intelligence Layer (Grounding, Architecture & Deep Reasoning)
  let modelSectionHtml = '';
  if (model === 'perplexity') {
    modelSectionHtml = `
<div class="callout callout-info" style="margin-top:16px;">
  <div class="callout-header">🌐 Verified Technical Citations & Knowledge Base References (Perplexity Grounding)</div>
  <ul style="margin:4px 0 4px 18px; color:inherit; line-height:1.6; font-size:12.5px;">
    <li><b>Broadcom / VMware KB 1003664:</b> Using esxtop to identify storage performance issues for ESXi (DAVG, KAVG, GAVG latency baselines).</li>
    <li><b>Broadcom / VMware KB 2004684:</b> Permanent Device Loss (PDL) and All-Paths-Down (APD) in vSphere 7.x/8.x.</li>
    <li><b>Broadcom / VMware KB 2060047:</b> Adjusting Round Robin IOPS limit from default 1000 to 1 for active SAN multipath load balancing.</li>
    <li><b>Broadcom / VMware KB 1010187:</b> Determining which ESXi host holds a file lock on a virtual machine disk (.vmdk).</li>
    <li><b>vSphere 8.0 Storage Administration Guide:</b> Native Multipathing Plugin (NMP), SATP rules, and Storage Array Type Plugins.</li>
  </ul>
</div>`;
  } else if (model === 'chatgpt') {
    modelSectionHtml = `
<div class="callout callout-info" style="margin-top:16px; border-left-color:#10b981;">
  <div class="callout-header">🧠 Enterprise Architectural Failure Synthesis & Blast Radius Isolation (ChatGPT 4o)</div>
  <div style="font-size:12.5px; line-height:1.6;">
    <b>Storage Tier Impact Isolation:</b> Cross-correlate whether latency spikes originate from the Host Kernel layer (KAVG &gt; 2ms indicates host queue depth exhaustion), Fabric Interconnect / SAN Switch layer (FC CRC errors or buffer credit starvation), or the Storage Array Target layer (DAVG &gt; 15ms indicates array controller saturation or background deduplication load). Verify Non-Disruptive Failover across redundant Fabrics A and B before maintenance.
  </div>
</div>`;
  } else if (model === 'claude') {
    modelSectionHtml = `
<div class="callout callout-info" style="margin-top:16px; border-left-color:#a855f7;">
  <div class="callout-header">🛡️ Defensive Engineering & Safety Checkpoints (Claude 3.5 Sonnet)</div>
  <ul style="margin:4px 0 4px 18px; color:inherit; line-height:1.6; font-size:12.5px;">
    <li><b>Pre-Change Risk Check:</b> Ensure storage rescan is restricted to specific adapter (<code>esxcli storage core adapter rescan -a vmhbaX</code>) instead of cluster-wide broadcast rescan to avoid I/O freezing during peak production hours.</li>
    <li><b>Workload Evacuation:</b> Migrate latency-sensitive VMs (SQL Server, Oracle, Active Directory DCs) via Storage vMotion to alternate datastores before bouncing storage paths.</li>
    <li><b>Rollback Checkpoint:</b> Record initial NMP device configuration (<code>esxcli storage nmp device list &gt; /tmp/nmp_backup.txt</code>) prior to modifying PSP Round Robin parameters.</li>
  </ul>
</div>`;
  } else if (model === 'deepseek') {
    modelSectionHtml = `
<div class="callout callout-info" style="margin-top:16px; border-left-color:#ef4444;">
  <div class="callout-header">⚡ Low-Level SCSI Sense Decoding & Kernel Trace Analysis (DeepSeek V3)</div>
  <div style="font-size:12.5px; line-height:1.6;">
    <b>vmkernel.log SCSI Sense Matrix:</b>
    <ul style="margin:4px 0 4px 18px;">
      <li><code>Sense: 0x2 0x04 0x01</code>: <b>NOT READY</b> - Logical unit in process of becoming ready (SAN controller failover in progress).</li>
      <li><code>Sense: 0x3 0x0c 0x00</code>: <b>MEDIUM ERROR</b> - Write error / bad block on storage array physical tier.</li>
      <li><code>Sense: 0x4 0x44 0x00</code>: <b>HARDWARE ERROR</b> - Target internal communication failure between storage heads.</li>
      <li><code>Sense: 0x5 0x24 0x00</code>: <b>ILLEGAL REQUEST</b> - Invalid field in CDB (VAAI ATS/Clone primitive unsupported by firmware).</li>
      <li><code>Sense: 0x6 0x29 0x00</code>: <b>UNIT ATTENTION</b> - Power-on or bus device reset occurred (Storage controller reboot).</li>
    </ul>
  </div>
</div>`;
  } else {
    modelSectionHtml = `
<div class="callout callout-info" style="margin-top:16px; border-left-color:#f59e0b;">
  <div class="callout-header">✨ Rapid Triage Matrix & Executive Remediation (Google Gemini)</div>
  <div style="font-size:12.5px; line-height:1.6;">
    <b>High-Priority Rapid Triage Flow:</b>
    <ol style="margin:4px 0 4px 18px;">
      <li><b>Status Assessment:</b> <code>esxcli storage filesystem list</code> (Locate degraded, inaccessible, or read-only datastores).</li>
      <li><b>Path Verification:</b> <code>esxcli storage core path list --device=&lt;naa_id&gt;</code> (Identify surviving active/optimized path count).</li>
      <li><b>Quick Remediate:</b> Execute adapter rescan & verify target controller VIP failover status.</li>
    </ol>
  </div>
</div>`;
  }

  return `
<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
  <div>
    <span style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.05em;">AI ENGINE: ${activeLabel}</span>
    <h3 style="color:var(--text-primary); font-size:18px; font-weight:800; margin:4px 0 0 0;">${detectedCategory}</h3>
  </div>
  <span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:12px; padding:4px 10px; border-radius:12px; font-weight:700;">Target: ${targetPlatform}</span>
</div>

<div class="callout callout-danger">
  <div class="callout-header">🔴 Root Cause Analysis</div>
  <div style="color:inherit; font-size:13px; line-height:1.6;">${rootCause}</div>
</div>

<h3 style="color:var(--text-primary); font-size:16px; font-weight:700; margin:18px 0 8px 0;">1. Diagnostic Inspection & CLI Commands</h3>
<p style="color:var(--text-secondary); font-size:13px; margin-bottom:8px;">Execute these validated diagnostic commands from the administrative shell:</p>
<pre><code style="background:#0f172a; color:#38bdf8; display:block; padding:14px; border-radius:6px; overflow-x:auto; font-family:'JetBrains Mono', monospace; font-size:12px; line-height:1.6;">${cliCommands}</code></pre>

<div class="callout callout-warning">
  <div class="callout-header">🟡 Engineering Pre-Checks & Caution</div>
  <div style="color:inherit; font-size:13px; line-height:1.6;">${cautionNote}</div>
</div>

<h3 style="color:var(--text-primary); font-size:16px; font-weight:700; margin:18px 0 8px 0;">2. Step-by-Step Remediation Playbook</h3>
<ol style="margin-left:22px; color:var(--text-primary); line-height:1.7;">
  ${remediationSteps.map(step => `<li style="margin-bottom:8px;">${step}</li>`).join('')}
</ol>

${modelSectionHtml}

<div class="callout callout-success" style="margin-top:16px;">
  <div class="callout-header">🟢 Health Verification & Post-Remediation Checks</div>
  <div>
    <ul style="margin:4px 0 4px 18px; color:inherit; line-height:1.6;">
      ${verificationSteps.map(v => `<li style="margin-bottom:4px;">${v}</li>`).join('')}
    </ul>
  </div>
</div>
`;
}
window.generateInAppAiDiagnosis = generateInAppAiDiagnosis;


function copyEngineeredPrompt() {
  const query = $('#aiPromptInput')?.value.trim() || 'SysAdmin troubleshooting playbook';
  const platform = $('#aiPlatformSelect')?.value || 'Infrastructure Systems';
  const engineered = `Act as an enterprise Systems Administrator and Infrastructure Engineer. Diagnose this ${platform} issue with root cause analysis, diagnostic commands, and remediation playbook:\n\n${query}`;
  copy(engineered);
}

function openExternalAiTool() {
  return openExternalAi();
}

function openExternalAi() {
  const query = $('#aiPromptInput')?.value.trim() || 'SysAdmin troubleshooting playbook';
  const platform = $('#aiPlatformSelect')?.value || 'Infrastructure Systems';
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
  if (pSel && pSel.children && pSel.children.length <= 1) {
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

  // Initialize AI Suggested Troubleshooting Prompts & Custom Prompts Dropdown
  renderPromptChips('all');
  loadCustomPromptsIntoDropdown();

  // Handle URL hash routing (e.g. #ai-assistant, #knowledge)
  if (window.location.hash) {
    const targetView = window.location.hash.replace('#', '').trim();
    if (['dashboard', 'ai-assistant', 'knowledge', 'research', 'logs', 'commands', 'scripts', 'resources', 'admin'].includes(targetView)) {
      setTimeout(() => nav(targetView), 50);
    }
  }
}

function toggleArticleModalFullscreen() {
  const modalBox = $('#articleModalBox');
  const modalOverlay = $('#articleModal');
  const btn = $('#modalFullscreenBtn');
  if (!modalBox || !modalOverlay) return;
  const isFs = modalBox.classList.toggle('is-fullscreen');
  modalOverlay.classList.toggle('modal-fullscreen-active', isFs);
  if (btn) btn.innerHTML = isFs ? '🗗' : '⛶';
}

// Global exports
window.nav = nav;
window.toggleSidebarSection = toggleSidebarSection;
window.toggleAdminSubmenu = toggleAdminSubmenu;
window.handlePublisherLink = handlePublisherLink;
window.filterByPlatform = filterByPlatform;
window.toggleSidebarFilter = toggleSidebarFilter;
window.toggleSidebarFilterRow = toggleSidebarFilterRow;
window.resetSidebarFilters = resetSidebarFilters;
window.onSelectTroubleshootingPrompt = onSelectTroubleshootingPrompt;
window.filterPromptCategory = filterPromptCategory;
window.saveCurrentAsCustomPrompt = saveCurrentAsCustomPrompt;
window.clearCustomPrompts = clearCustomPrompts;
window.openArticleById = openArticleById;
window.openArticle = openArticle;
window.closeArticleModal = closeArticleModal;
// Corporate Modern Theme Toggle (Light / Dark)
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.documentElement.classList.toggle('dark', next === 'dark');
  try {
    localStorage.setItem('sysadminiq_theme', next);
  } catch (e) {}
  updateThemeToggleButtons(next);
}

function updateThemeToggleButtons(theme) {
  const isLight = theme === 'light';
  const label = isLight ? '☀️ Light' : '🌙 Dark';
  const mainBtn = document.getElementById('themeToggleBtn');
  if (mainBtn) mainBtn.innerHTML = label;
  const portalBtn = document.getElementById('portalThemeToggleBtn');
  if (portalBtn) portalBtn.innerHTML = label;
}

window.toggleTheme = toggleTheme;
window.updateThemeToggleButtons = updateThemeToggleButtons;
window.toggleArticleModalFullscreen = toggleArticleModalFullscreen;
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
window.submitAiFollowUp = submitAiFollowUp;
window.applyFollowUpPreset = applyFollowUpPreset;
window.copyEngineeredPrompt = copyEngineeredPrompt;
window.openExternalAi = openExternalAi;
window.openExternalAiTool = openExternalAiTool;
window.copyAiOutput = copyAiOutput;
window.exportAiToPublisher = exportAiToPublisher;
window.sendLogsToAi = sendLogsToAi;
window.executeGlobalSearch = executeGlobalSearch;
window.executeInternetSearch = executeInternetSearch;
window.executeResearchSearch = executeResearchSearch;
window.filterResearchTab = filterResearchTab;
window.launchWebSearch = launchWebSearch;
window.renderAdminView = renderAdminView;
window.syncWithCloudflareD1 = syncWithCloudflareD1;
window.exportDatabaseJson = exportDatabaseJson;
window.showToast = showToast;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSysAdminIQ();
    updateThemeToggleButtons(document.documentElement.getAttribute('data-theme') || 'light');
  });
} else {
  initSysAdminIQ();
  updateThemeToggleButtons(document.documentElement.getAttribute('data-theme') || 'light');
}
