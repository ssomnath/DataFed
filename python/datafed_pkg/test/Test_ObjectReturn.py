import datafed
import datafed.CommandLib
import datafed.Config

def main():
#    config = datafed.Config.API() #generate default configs
 #   print(config.getOpts())
    datafed.CommandLib.init() #Config module will try to find things and send to MessageLib init
    #returned = datafed.CommandLib.command('data create "Testing the Object Return" -a testobj2 -d "This is to test the object return of the exec function"')
    return1 = datafed.CommandLib.command('ls -c 3')
    return2 = datafed.CommandLib.command("more")
    return3 = datafed.CommandLib.command("more 2")
    return4 = datafed.CommandLib.command("more")
    #print(returned)
    print(return1[0].item[0].id)
    print(return2)
    print(return3)
    print(return4)

if __name__ == "__main__":
    main()