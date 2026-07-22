# tabby-k8s-exec

🌐 [English](README.md) | **한국어**

📖 **[문서](https://search5.github.io/tabby-k8s-exec/ko/)** (English / 한국어)

[Tabby](https://tabby.sh) 터미널 플러그인으로, Kubernetes 파드/컨테이너에 인터랙티브 셸을 여는 기능을 제공합니다 — `kubectl exec -it <pod> -- sh`와 같은 역할을 공식 [`@kubernetes/client-node`](https://github.com/kubernetes-client/javascript) SDK로 네이티브 구현했습니다. 런타임에 `kubectl` 바이너리가 필요 없습니다.

## 기능

- **네이티브 Kubernetes exec 프로토콜** — `@kubernetes/client-node`를 이용해 클러스터의 exec WebSocket 엔드포인트에 직접 연결합니다. `kubectl` 프로세스를 띄우지 않습니다.
- **단계별 연결 선택기** — kubeconfig 컨텍스트 → 네임스페이스 → 파드 → 컨테이너 순으로 선택하며, 각 목록은 클러스터에서 실시간으로 채워집니다 (네임스페이스/파드 목록은 수동 새로고침 버튼 사용, 컨텍스트 목록은 로컬 kubeconfig 파일에서 읽음).
- **명확한 사전 연결 진단** — 선택한 파드가 실제로 실행 중이 아니면, 연결을 시도하기 전에 파드 상태를 확인해서 원인 불명의 전송 오류 대신 정확한 이유를 보여줍니다.
- **셸 폴백** — `/bin/bash`를 먼저 시도하고, 컨테이너에 bash가 없으면 자동으로 `/bin/sh`로 재시도하는 옵션을 제공합니다.
- **멀티 컨테이너 파드 지원** — 컨테이너 선택기는 선택한 파드의 실제 `containers`/`initContainers` 목록에서 채워집니다.
- **탭 복구** — Tabby가 재시작되면, 열려있던 kube-exec 탭이 자동으로 다시 열리고 같은 파드에 재연결되며 터미널 스크롤백도 복원됩니다.

## 사전 요구 사항

- [Tabby](https://tabby.sh) 데스크톱 앱.
- 접근 가능한 클러스터를 가리키는 컨텍스트가 포함된 정상 동작하는 kubeconfig 파일 (기본값 `~/.kube/config`).
- kubeconfig가 `exec` 기반 인증 플러그인(예: `aws eks get-token`, `gke-gcloud-auth-plugin`, `kubelogin`)을 사용한다면, 해당 바이너리가 설치되어 `PATH`에 있어야 합니다 — 이는 그 kubeconfig 인증 방식 자체의 특성(‘kubectl’도 동일하게 요구함)이라 플러그인이 우회할 수 없습니다. 정적 토큰, 클라이언트 인증서, 표준 OIDC 인증은 별도로 필요한 것이 없습니다.

## 설치

### 방법 A — Tabby 플러그인 매니저 (권장)

**Tabby Settings → Plugins**에서 `k8s-exec`를 검색해 Install을 클릭하세요. 안내가 뜨면 Tabby를 재시작합니다.

### 방법 B — 소스에서 직접 설치

**요구 사항:** [Node.js](https://nodejs.org/) 18 이상

```bash
git clone https://github.com/search5/tabby-k8s-exec.git
cd tabby-k8s-exec
npm install
npm run build
npm run install-plugin
```

`npm run install-plugin`은 빌드된 플러그인을 Tabby의 플러그인 디렉터리로 복사합니다 (Linux는 `~/.config/tabby/plugins`, macOS는 `~/Library/Application Support/tabby/plugins`, Windows는 `%APPDATA%\tabby\plugins`). 설치 후 Tabby를 재시작해야 적용됩니다.

## 사용법

새 연결을 만들고 타입으로 **Kubernetes Exec**를 선택한 뒤 다음을 입력합니다:

| 필드 | 설명 |
|---|---|
| Kubeconfig Path | kubeconfig 파일 경로, 기본값 `~/.kube/config` |
| Context | 사용할 kubeconfig 컨텍스트 (비워두면 파일의 current-context 사용) |
| Namespace | 대상 파드가 있는 네임스페이스 |
| Pod | exec할 파드 (선택한 네임스페이스의 파드 목록을 보려면 Refresh) |
| Container | 파드 내 컨테이너 (파드에 컨테이너가 하나뿐이면 자동 선택) |
| Command | 실행할 셸/명령어, 기본값 `/bin/sh` |

컨텍스트를 선택해도 네임스페이스가 자동으로 로드되지 않습니다 — 컨텍스트만 둘러보는 중에 매번 클러스터 API 호출이 발생하는 걸 막기 위해, Namespace 필드의 Refresh 버튼을 명시적으로 눌러야 합니다.

## 알려진 제한 사항

- 일부 프록시/로드밸런서 뒤에서는 약 5분 정도 유휴 상태가 지속되면 exec 세션이 끊길 수 있습니다 (`@kubernetes/client-node` 상위 라이브러리의 제약이며, v1에서는 이를 우회하는 구현이 없습니다) — 이런 경우 Tabby의 재연결 단축키로 다시 연결하세요.
- 프로필당 kubeconfig 파일 하나만 지원합니다 (`KUBECONFIG` 스타일의 다중 파일 병합은 지원하지 않음).

## 개발

```bash
npm run watch          # 변경 시 자동 재빌드
npm run install-plugin # dist/를 Tabby 플러그인 디렉터리로 복사
```

## 라이선스

MIT — [LICENSE](LICENSE) 참고.
