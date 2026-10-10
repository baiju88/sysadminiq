/**
 * SysAdminIQ Knowledge Base & Troubleshooting Portal
 * Production APP.JS
 * 
 * Features:
 * - Full Navigation & Search across Knowledge Base, Analyzer, Logs, Commands, Scripts, Resources
 * - Clean Article View (Publishing, Editing, and Deletion exclusive to publisher.html / publish.html)
 * - Seamless link to publisher.html with Cloudflare authentication
 * - Rich built-in diagnostic articles including new vCenter STS Certificate and Azure Boot Recovery playbooks
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

function getAuthKey() {
  return localStorage.getItem(AUTH_STORAGE_KEY) || 
         localStorage.getItem(CF_TOKEN_KEY) || 
         localStorage.getItem(LEGACY_AUTH_KEY) || '';
}

function getAuthHeaders() {
  const key = getAuthKey();
  if (!key) return {};
  return {
    'Authorization': `Bearer ${key}`,
    'X-Auth-Token': key,
    'X-Auth-Key': key
  };
}

function isAuthorized() {
  return Boolean(getAuthKey());
}

function promptAuth() {
  const existing = getAuthKey();
  const key = prompt('Cloudflare Authentication:\nPlease enter your Authorization Key:', existing || '');
  if (key && key.trim()) {
    localStorage.setItem(AUTH_STORAGE_KEY, key.trim());
    localStorage.setItem(CF_TOKEN_KEY, key.trim());
    localStorage.setItem(LEGACY_AUTH_KEY, key.trim());
    alert('Authorization key saved successfully.');
    renderAll();
    return true;
  }
  return false;
}

function embeddedDB() {
  const get = (name) => {
    try {
      return (typeof window !== "undefined" && window[name] !== undefined) ? window[name] : [];
    } catch (e) {
      return [];
    }
  };
  const articles = get('KB_ARTICLES');
  return normalizeDB({
    articles: Array.isArray(articles) && articles.length > 0 ? articles : BUILTIN_ARTICLES,
    scripts: get('SCRIPTS'),
    commands: get('COMMANDS'),
    resources: get('RESOURCES'),
    log_map: get('LOG_MAP')
  });
}

function normalizeDB(data) {
  const out = { articles: [], scripts: [], commands: [], resources: [], log_map: [], ...(data || {}) };
  for (const k of ['articles', 'scripts', 'commands', 'resources']) {
    out[k] = (Array.isArray(out[k]) ? out[k] : []).map(x => ({ ...x, platform: x.platform || 'VMware' }));
  }
  if (!out.articles.length) {
    out.articles = [...BUILTIN_ARTICLES];
  }
  out.log_map = Array.isArray(out.log_map) ? out.log_map : [];
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
  const fallback = localDB();

  try {
    const response = await fetch('https://sysadminiq-api.baijucm.workers.dev', { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const d1Articles = await response.json();

    DB = {
      ...fallback,
      articles: Array.isArray(d1Articles) && d1Articles.length > 0 ? d1Articles : fallback.articles
    };

    saveLocal(DB);
    BACKEND_ONLINE = true;
  } catch (e) {
    DB = fallback;
    BACKEND_ONLINE = false;
    console.warn('Remote API unavailable, using local knowledge base:', e);
  }

  renderAll();
  updateBackendStatus();
}

function updateBackendStatus() {
  const el = $('#backendStatus');
  if (el) {
    el.innerHTML = BACKEND_ONLINE
      ? `<span class="status-dot online"></span> Connected to Cloudflare Database — ${DB.articles.length} articles indexed`
      : `<span class="status-dot offline"></span> Local Mode — ${DB.articles.length} articles loaded from knowledge base`;
  }
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
  $$('.nav').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  $$('.view').forEach(x => x.classList.toggle('active', x.id === view));
}

function platformOf(x) {
  return x.platform || 'VMware';
}

function renderStats() {
  const el = $('#stats');
  if (!el) return;
  const cats = [...new Set(DB.articles.map(x => x.category).filter(Boolean))];
  el.innerHTML = `
    <div class="stat"><b>${DB.articles.length}</b><span>Knowledge articles</span></div>
    <div class="stat"><b>${cats.length}</b><span>Subcategories</span></div>
    <div class="stat"><b>${DB.commands.length}</b><span>Commands indexed</span></div>
    <div class="stat"><b>${DB.scripts.length}</b><span>Automation scripts</span></div>
  `;
}

function scoreArticle(a, text) {
  const t = text.toLowerCase();
  return [a.title, a.platform, a.category, ...arr(a.keywords), ...arr(a.symptoms), ...arr(a.causes), ...arr(a.logs)]
    .reduce((n, x) => n + (t.includes(String(x).toLowerCase()) ? 3 : String(x).toLowerCase().split(/\s+/).filter(w => w.length > 3 && t.includes(w)).length), 0);
}

function findMatches(text) {
  return DB.articles
    .map(a => ({ ...a, score: scoreArticle(a, text) }))
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score);
}

function articleCard(a) {
  return `
    <div class="article-card" data-article="${esc(a.id)}">
      <span class="tag">${esc(platformOf(a))}</span>
      <span class="subtag">${esc(a.category || 'General')}</span>
      <h3>${esc(a.title)}</h3>
      <p>${esc(arr(a.symptoms)[0] || a.description || (a.content ? a.content.slice(0, 120) + '...' : 'Troubleshooting playbook'))}</p>
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

// Clean article reading view (No edit/delete options in reader mode)
function openArticle(a) {
  if (!a) return;
  const modalContent = $('#modalContent');
  if (!modalContent) return;

  const isD1Article = a.content && !a.symptoms && !a.causes;

  if (isD1Article) {
    modalContent.innerHTML = `
      <div class="article-detail">
        <span class="tag">${esc(platformOf(a))}</span>
        <span class="subtag">${esc(a.category || 'General')}</span>
        <h1>${esc(a.title)}</h1>

        <h3>Article Content</h3>
        <pre style="white-space:pre-wrap;padding:15px;background:#f8f9fb;color:#1f2937;border:1px solid #dcdcdc;border-radius:6px;font-size:14px;line-height:1.6;max-height:500px;overflow:auto;">${esc(a.content || '')}</pre>

        ${
          a.attachments && a.attachments.length
            ? `
              <h3>Attachments</h3>
              <div class="attachments">
                ${a.attachments.map(file => `
                  <div class="attachment-item">
                    📎
                    <a href="#" onclick="openAttachment('${esc(file.key)}'); return false;">
                      ${esc(file.name || 'Attachment')}
                    </a>
                    <br>
                    <small>${esc(file.type || '')}</small>
                  </div>
                `).join('')}
              </div>
            `
            : ''
        }
      </div>
    `;
  } else {
    const list = x => `<ul>${arr(x).map(v => `<li>${esc(v)}</li>`).join('')}</ul>`;

    modalContent.innerHTML = `
      <div class="article-detail">
        <span class="tag">${esc(platformOf(a))}</span>
        <span class="subtag">${esc(a.category || 'General')}</span>
        <h1>${esc(a.title)}</h1>
        <p class="muted">${esc(a.description || '')}</p>

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

        ${
          a.attachments && a.attachments.length
            ? `
              <h3>Attachments</h3>
              <div class="attachments">
                ${a.attachments.map(file => `
                  <div class="attachment-item">
                    📎
                    <a href="#" onclick="openAttachment('${esc(file.key)}'); return false;">
                      ${esc(file.name || 'Attachment')}
                    </a>
                    <br>
                    <small>${esc(file.type || '')}</small>
                  </div>
                `).join('')}
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  const modal = $('#articleModal');
  if (modal) modal.classList.remove('hidden');
}

function openAttachment(key) {
  const url = `https://sysadminiq-api.baijucm.workers.dev/file?key=${encodeURIComponent(key)}`;
  window.open(url, '_blank');
}

function openPlatform(name) {
  nav('knowledge');
  const sel = $('#kbPlatform');
  if (sel) sel.value = name;
  renderKB($('#kbSearch')?.value || '', name, $('#kbCategory')?.value || 'all');
}

function renderPlatforms() {
  const el = $('#platformGrid');
  if (!el) return;
  el.innerHTML = MAIN_CATEGORIES.map(c => {
    const count = DB.articles.filter(a => platformOf(a) === c.name).length;
    return `
      <div class="platform-card" data-platform="${esc(c.name)}">
        <div class="badge">${esc(c.short)}</div>
        <div class="platform-title">${esc(c.name)}</div>
        <div class="platform-desc">${esc(c.desc)}</div>
        <div class="platform-meta">${count} playbooks available</div>
      </div>
    `;
  }).join('');

  $$('[data-platform]').forEach(b => {
    b.onclick = () => openPlatform(b.dataset.platform);
  });
}

function renderRecent() {
  const el = $('#recentArticles');
  if (!el) return;
  el.innerHTML = DB.articles.slice(0, 6).map(articleCard).join('') || '<div class="panel">No articles found.</div>';
  bindArticleCards();
}

function renderDashboard() {
  renderStats();
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

  el.innerHTML = filtered.map(articleCard).join('') || '<div class="panel">No knowledge articles match your filter.</div>';
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
      <small>${esc(x.category || '')} — ${esc(x.use || x.description || '')}</small>
      <pre>${esc(x.cmd || x.code || '')}</pre>
    </div>
  `).join('') || '<div class="panel">No commands found.</div>';

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
  el.innerHTML = DB.scripts.map((s, i) => `
    <div class="article-card">
      <span class="tag">${esc(s.category || 'Automation')}</span>
      <h3>${esc(s.title || s.name)}</h3>
      <p>${esc(s.desc || s.description || '')}</p>
      <button class="copy" data-script="${i}">Copy</button>
      <pre>${esc(s.code || '')}</pre>
    </div>
  `).join('') || '<div class="panel">No scripts found.</div>';

  $$('[data-script]').forEach(b => {
    b.onclick = () => copy(DB.scripts[+b.dataset.script]?.code || '');
  });
}

function renderResources(q = '', cat = 'all') {
  const el = $('#resourceResults');
  if (!el) return;
  const out = DB.resources.filter(r =>
    (cat === 'all' || r.category === cat) &&
    (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  );

  el.innerHTML = out.map(r => `
    <div class="article-card">
      <span class="tag">${esc(r.category || 'Resource')}</span>
      <h3>${esc(r.name || r.title)}</h3>
      <p>${esc(r.description || r.notes || '')}</p>
      ${r.url ? `<a class="result-link" href="${esc(r.url)}" target="_blank" rel="noopener">Open resource →</a>` : ''}
    </div>
  `).join('') || '<div class="panel">No resources found.</div>';

  const rCat = $('#resourceCategory');
  if (rCat) {
    rCat.innerHTML = '<option value="all">All categories</option>' + [...new Set(DB.resources.map(x => x.category).filter(Boolean))].map(c => `<option>${esc(c)}</option>`).join('');
  }
}

function analyze() {
  const inputEl = $('#issueInput');
  const outEl = $('#analysisOutput');
  if (!inputEl || !outEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    outEl.innerHTML = '<div class="result-panel">Please enter an issue description or log excerpt.</div>';
    return;
  }

  const matches = findMatches(text);
  currentCase = { input: text, matches, when: new Date().toLocaleString() };
  const top = matches.slice(0, 3);

  let html = '<div class="result-panel"><h2>Investigation plan</h2>';
  if (!top.length) {
    html += '<div class="diagnosis"><b>No strong local match yet.</b><br>Start with service status, capacity, network reachability and the earliest relevant log error.</div>';
  } else {
    top.forEach((a, i) => {
      html += `
        <div class="diagnosis">
          <span class="score">Match ${i + 1}: ${a.score}</span>
          <h3>${esc(a.title)}</h3>
          <b>Likely causes</b>
          <ul>${arr(a.causes).slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <b>Next checks</b>
          <ol>${arr(a.checks).slice(0, 5).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
          <button type="button" onclick="openArticleById('${esc(a.id)}')">Open full article</button>
        </div>
      `;
    });
  }
  html += '</div>';
  outEl.innerHTML = html;
}

function inspectLogs() {
  const inputEl = $('#logInput');
  const outEl = $('#logOutput');
  if (!inputEl || !outEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    outEl.innerHTML = '<div class="result-panel">Paste a log excerpt first.</div>';
    return;
  }

  const patterns = [
    ['vpxd', 'vCenter Server'],
    ['hostd', 'ESXi host management'],
    ['vpxa', 'vCenter agent communication'],
    ['vmkernel', 'ESXi kernel/storage/network'],
    ['fdm', 'vSphere HA'],
    ['vmon', 'vCenter service lifecycle'],
    ['certificate|ssl|trust', 'Certificate / TLS'],
    ['apd|all paths down', 'Storage path / APD']
  ];

  const hits = patterns.filter(([p]) => new RegExp(p, 'i').test(text));
  outEl.innerHTML = '<div class="result-panel"><h2>Detected components</h2>' +
    (hits.length
      ? hits.map(x => `<div class="log-hit"><b>${esc(x[1])}</b><br>Search related entries in the corresponding VMware log and correlate timestamps.</div>`).join('')
      : 'No known VMware component pattern detected.') + '</div>';
}

function renderAdmin() {
  const adminContent = $('#adminContent');
  if (!adminContent) return;

  adminContent.innerHTML = `
    <div style="background:#fff7ed;border:1px solid #fed7aa;padding:18px;border-radius:8px;margin-bottom:20px;">
      <h3 style="margin:0 0 8px 0;color:#c2410c;font-size:16px;">Article Publishing & Management Portal</h3>
      <p style="margin:0 0 14px 0;font-size:13px;color:#7c2d12;line-height:1.5;">
        Publishing new articles, updating existing articles, managing file attachments, and deleting articles are strictly handled via the dedicated <b>publisher.html</b> portal.
      </p>
      <a href="/publisher.html" target="_blank" style="display:inline-block;background:#f38020;color:white;padding:10px 18px;border-radius:4px;font-weight:bold;text-decoration:none;font-size:14px;">
        🔑 Open publisher.html Portal ↗
      </a>
    </div>
  `;
}

function renderLogMap() {
  const el = $('#logMap');
  if (!el) return;
  el.innerHTML = (DB.log_map || []).map(x => `
    <div class="command">
      <b>${esc(x[0] || '')}</b><br>
      <small>${esc(x[1] || '')}</small>
    </div>
  `).join('');
}

function renderAll() {
  renderDashboard();
  setupFilters();
  renderKB($('#kbSearch')?.value || '', $('#kbPlatform')?.value || 'all', $('#kbCategory')?.value || 'all');
  renderCommands();
  renderScripts();
  renderResources();
  renderLogMap();
  if ($('#adminContent')) renderAdmin();
}

// Initial setup on DOM ready
function initSysAdminIQ() {
  // Theme Toggle
  const themeBtn = $('#themeBtn');
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? '' : 'dark';
      localStorage.vmTheme = document.documentElement.dataset.theme;
    };
  }
  if (localStorage.vmTheme) {
    document.documentElement.dataset.theme = localStorage.vmTheme;
  }

  // Navigation handlers
  $$('.nav').forEach(b => {
    b.onclick = () => nav(b.dataset.view);
  });

  $$('.platform-nav').forEach(b => {
    b.onclick = () => openPlatform(b.dataset.platform);
  });

  // Search handlers
  const searchBtn = $('#searchBtn');
  const globalSearch = $('#globalSearch');
  if (searchBtn && globalSearch) {
    searchBtn.onclick = () => {
      nav('knowledge');
      const kbSearch = $('#kbSearch');
      if (kbSearch) kbSearch.value = globalSearch.value;
      renderKB(globalSearch.value, $('#kbPlatform')?.value || 'all', $('#kbCategory')?.value || 'all');
    };
    globalSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }

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

  // Analyzer & Inspector
  const analyzeBtn = $('#analyzeBtn');
  if (analyzeBtn) analyzeBtn.onclick = analyze;

  const inspectLogBtn = $('#inspectLogBtn');
  if (inspectLogBtn) inspectLogBtn.onclick = inspectLogs;

  // Resource Search & Filter
  const resourceSearch = $('#resourceSearch');
  const resourceCat = $('#resourceCategory');
  if (resourceSearch) {
    resourceSearch.oninput = e => renderResources(e.target.value, resourceCat?.value || 'all');
  }
  if (resourceCat) {
    resourceCat.onchange = e => renderResources(resourceSearch?.value || '', e.target.value);
  }

  // Article Modal Close
  const closeModal = $('#closeModal');
  const articleModal = $('#articleModal');
  if (closeModal && articleModal) {
    closeModal.onclick = () => articleModal.classList.add('hidden');
    articleModal.onclick = e => {
      if (e.target.id === 'articleModal') articleModal.classList.add('hidden');
    };
  }

  // Export Case
  const exportBtn = $('#exportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const blob = new Blob([JSON.stringify(currentCase || { exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sysadminiq-troubleshooting-case.json';
      a.click();
    };
  }

  // Load database and render
  loadDB();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSysAdminIQ);
} else {
  initSysAdminIQ();
}
