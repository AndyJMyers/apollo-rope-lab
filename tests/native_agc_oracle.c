/* SPDX-License-Identifier: GPL-2.0-or-later
   Independent native execution of the same corresponding emulator source.
   This compares host/WASI integration; it does not independently validate the CPU design. */
#include <stdio.h>
#include <stdlib.h>
#include "agc_engine.h"
extern agc_t State;
extern void set_fixed(unsigned char *);
extern void cpu_reset(void);
extern void cpu_step(unsigned int);
extern int packet_write(unsigned short,unsigned short);
extern unsigned int packet_read(void);
FILE *rfopen(const char *path,const char *mode){return fopen(path,mode);}
static void step(unsigned int n){while(n){unsigned int k=n>1024?1024:n;cpu_step(k);n-=k;while(packet_read()){};}}
int main(int argc,char **argv){
 if(argc!=2)return 2;
 FILE *f=fopen(argv[1],"rb");if(!f)return 3;
 unsigned char *b=malloc(73728);if(fread(b,1,73728,f)!=73728)return 4;fclose(f);set_fixed(b);free(b);cpu_reset();step(1);packet_write(0x100|015,31);packet_write(0x100|032,020000);packet_write(032,020000);step(256);step(100000);
 unsigned short keys[]={17,3,5,28};for(int i=0;i<4;i++){packet_write(015,keys[i]);step(60000);}step(100000);
 for(int bank=0;bank<8;bank++)for(int i=0;i<256;i++)printf("%u\n",State.Erasable[bank][i]);
 return 0;
}
