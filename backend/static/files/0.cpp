#include <bits/stdc++.h>
using namespace std;
const long long mod=1000000007;
int n,m,q,x,y;
long long z,s,a[101][101][101];
int main()
{
    ios::sync_with_stdio(false),cin.tie(nullptr),cout.tie(nullptr);
	cin>>n>>m>>q;
	for(int i=1;i<=n;++i)for(int j=1;j<=m;++j)for(int k=1;k<=m;++k)
	{
		cin>>a[i][j][k];
		a[i][j][k]=(a[i][j][k]%mod+mod)%mod;
	}
    while(q--)
    {
    	cin>>x>>y>>z;
    	z=(z%mod+mod)%mod;
    	for(int i=1;i<=n;++i)for(int j=1;j<=m;++j)a[i][j][y]=(a[i][j][y]+a[i][j][x]*z%mod)%mod;
	}
	for(int i=1;i<=n;++i)
	{
		s=0;
		for(int j=1;j<=m;++j)for(int k=1;k<=m;++k)s=(s+a[i][j][k])%mod;
		cout<<s<<'\n';
	}
    return 0;
}
